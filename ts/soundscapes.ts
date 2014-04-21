
/// <reference path="../typings/d3/d3.d.ts" />
/// <reference path="../typings/wavesurfer/wavesurfer.d.ts" />

"use strict";

module SoundScapes {

    // Width and height variables for the d3 graph.
    var width = 900, height = 600;

    export interface ClipNode extends D3.Layout.GraphNode {
        weight: number;
        name: string;
        file: string;
        category: number;
    }

    export interface ClipLink {
        source: ClipNode;
        target: ClipNode;
        path: number;
    }

    export interface ClipGraph {
        nodes: Array<ClipNode>;
        links: Array<ClipLink>;
    }

    export class ClipNavigator {
        graph: ClipGraph;
        node: number;       // Current position on the main spine.
        category: number;   // Category
        index: number;      // Node to play

        constructor(graph: ClipGraph) {
            this.graph    = graph;
            this.node     = 0;
            this.category = null;
            this.index    = null;
        }

        reset(): void {
            this.node     = 0;
            this.category = null;
            this.index    = null;
        }

        getNext(n?: number): number {
            var here = (n == null) ? this.node : n,
                node = null;
            this.graph.links.every(function(link): boolean {
                if (link.source.index === here && link.path == 1) {
                    node = link.target.index;
                    return false;
                }
                return true;
            });
            return node;
        }

        next(): void {
            this.node = this.getNext();
        }

        findParentFrom(n: number): number {
            var node = this.getNode(n),
                pId  = null;

            if (node.category == null) {
                pId = n;
            } else {
                this.graph.links.every(function(link: ClipLink): boolean {
                    if (link.source.index == n) {
                        pId = link.target.index;
                        return false;
                    }
                    return true;
                });
            }

            return pId;
        }

        findPlayableFrom(n: number): number {
            var _this = this,
                index = null,
                node  = this.graph.nodes[n];

            if (this.category == null) {
                index = n;
            } else {
                this.graph.links.every(function(link) {
                    if (link.target.index === n) {
                        var subnode = link.source;

                        if (subnode.category === _this.category) {
                            index = subnode.index;
                            return false;
                        }
                    }
                    return true;
                });
            }

            return index;
        }

        findPlayable(): boolean {
            var index = this.findPlayableFrom(this.node),
                found = false;

            if (index != null) {
                this.index = index;
                found      = true;
            }

            return found;
        }

        findNextPlayable(): number {
            var playable = null,
                next     = this.node,
                np;

            while (true) {
                next = this.getNext(next);

                if (next == null) {
                    break;
                }

                np = this.findPlayableFrom(next);
                if (np != null) {
                    playable = np;
                    break;
                }
            }

            return playable;
        }

        getNode(i: number): ClipNode {
            return this.graph.nodes[i];
        }

        getPlayable(): ClipNode {
            return this.getNode(this.index);
        }

        getPlayableFile(): string {
            return this.getPlayable().file;
        }

        getPlayableName(): string {
            return this.getPlayable().name;
        }

        rewind() {
            this.node  = 0;
            this.index = null;
        }

        skipTo(node: number, playing: number, category: number): void {
            this.node     = node;
            this.index    = playing;
            this.category = category;
        }
    }

    export class WaveCache {
        surfer: WaveSurfer;
        next: string;
        cached: ArrayBuffer;

        constructor() {
            this.surfer = Object.create(WaveSurfer);
            this.next   = null;
            this.cached = null;
        }

        init(): void {
            var _this = this;

            this.surfer.init({
                container: document.querySelector('#wave'),
                waveColor: 'rgba(0,0,0,0.25)',
                progressColor: 'rgb(0,0,0,0)',
                cursorColor: 'white',
                cursorWidth: '4'
            });
            this.surfer.on('ready', function() {
                _this.surfer.play();
                _this.cache();
            });
        }

        swap(file: string): void {
            this.playCache();
            this.next = (file != null) ? 'clips/' + file : null;
        }

        playCache(): void {
            this.surfer.drawer.clearWave();
            this.surfer.loadBuffer(this.cached);
        }

        on(eventName: string, handler: (e: Event, ws: WaveSurfer) => void): void {
            var _this = this;
            this.surfer.on(eventName, function(e) {
                handler(e, _this.surfer);
            });
        }

        once(eventName: string, handler: (e: Event, ws: WaveSurfer) => void): void {
            var _this = this;
            this.surfer.once(eventName, function(e) {
                handler(e, _this.surfer);
            });
        }

        cache(link?: string): XMLHttpRequest {
            var _this = this,
                xhr;

            link = (link == null) ? this.next : link;
            this.next = link;

            xhr = new XMLHttpRequest();
            xhr.open('GET', link, true);
            xhr.send();

            xhr.responseType = 'arraybuffer';

            xhr.addEventListener('load', function () {
                if (200 == xhr.status) {
                    _this.cached = xhr.response;
                } else {
                }
            });
            xhr.addEventListener('error', function () {
            });

            return xhr;
        }
    }

    export class SoundScapes {
        wavecache: WaveCache;
        force: D3.Layout.ForceLayout;
        svg: D3.Selection;
        graph: ClipGraph;
        nav: ClipNavigator;
        node: D3.Selection;
        link: D3.Selection;

        constructor() {
            this.wavecache = new WaveCache();
            this.force = d3.layout.force()
                .linkDistance(55)
                .charge(-150)
                .size([width, height]);
            this.svg = d3.select("#clips").append("svg")
                .attr("width", width)
                .attr("height", height);
        }

        init(): void {
            this.wavecache.init();
            this.wireEvents();
        }

        wireEvents(): void {
            var _this = this;

            this.wireOptions();

            d3.select("#play").on("click", function() {
                _this.wavecache.surfer.playPause();
            });

            this.wavecache.on('finish', function(e, ws) {
                _this.setCurrent(false);
                _this.nav.index = null;
                while (true) {
                    _this.nav.next();
                    if (_this.nav.node == null) {
                        _this.wavecache.surfer.drawer.clearWave();
                        _this.clearOptions();
                        _this.nav.reset();
                        return;
                    }
                    if (_this.nav.findPlayable()) {
                        break;
                    }
                }

                var next = _this.nav.findNextPlayable();
                if (next == null) {
                    _this.wavecache.playCache();
                    _this.setCurrent(true);
                } else {
                    _this.wavecache.swap(_this.nav.getNode(next).file);
                    _this.setCurrent(true);
                }
            });
        }

        wireReady(): void {
            var _this = this;
            this.wavecache.once('ready', function(e, ws) {
                _this.setCurrent(true);
                ws.play();
                _this.queueNextPlayable();
            });
        }

        go(): void {
            var _this = this;
            d3.json("clips.json", function(error, graph) {
                _this.onData(error, graph);
            });
        }

        startForce(): void {
            this.force
                .nodes(this.graph.nodes)
                .links(this.graph.links)
                .start();
        }

        wireOptions(): void {
            var _this   = this;
            var options = d3.selectAll('#options li')
                .on('click', function() {
                    options.classed('current', false);
                    d3.select(this).classed('current', true);

                    if (_this.nav.index != null) {
                        _this.setCurrent(false);
                    }
                    _this.nav.rewind();

                    var categoryOption = d3.select(this).attr('data-category');
                    if (categoryOption == 'all') {
                        _this.nav.category = null;
                    } else {
                        _this.nav.category = parseInt(categoryOption);
                    }

                    _this.wireReady();
                    _this.nav.findPlayable();
                    _this.loadCurrentPlayable();
                    _this.queueNextPlayable();
                });
        }

        drawGraph(): void {
            var _this = this;

            this.link = this.svg.selectAll(".link")
                .data(this.graph.links)
                .enter().append("line")
                    .attr("class", function(link) {
                        if (link[ "path"] > 0) {
                            return "link path" ;
                        } else {
                            return "link" ;
                        }
                    });

            this.node = this.svg.selectAll(".node")
                .data(this.graph.nodes)
                .enter().append("circle")
                    .attr("class", "node")
                    .attr("id", function(d) {
                        return d.name
                    })
                    .attr("r", function(d) {
                        return 5 * d.weight;
                    })
                    .call(this.force.drag)
                    .on('click', function(d: ClipNode, i: number): void {
                        var p = _this.nav.findParentFrom(d.index);
                        if (_this.nav.index != null) {
                            _this.setCurrent(false);
                        }
                        _this.nav.reset();
                        _this.nav.skipTo(p, d.index, d.category);
                        _this.setCategory(d.category);
                        _this.loadCurrentPlayable();
                        _this.setCurrent(true);
                        _this.queueNextPlayable();
                    });

            this.node.append("title")
                .text(function(d) { return d.name; });
        }

        wireForce(): void {
            var _this = this;
            this.force.on("tick", function() {
                _this.link
                    .attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });

                _this.node
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; });
            });
        }

        onData(error, graph: ClipGraph): void {
            window['graph'] = graph;
            this.graph = graph;
            this.nav   = new ClipNavigator(graph);

            this.startForce();
            this.drawGraph();
            this.wireForce();
        }

        clearOptions(): void {
            d3.selectAll('#options li')
                .classed('current', false);
        }

        setCategory(c: number): void {
            var category = this.nav.category,
                selector;

            this.clearOptions();

            if (category == null) {
                selector = '.all';
            } else {
                selector = '.category' + category;
            }

            d3.selectAll('#options ' + selector)
                .classed('current', true);
        }

        loadCurrentPlayable(): void {
            this.wavecache.surfer.load('clips/' + this.nav.getPlayableFile());
        }

        queueNextPlayable(n?: number): void {
            if (n == null) {
                n = this.nav.findNextPlayable();
            }
            if (n != null) {
                this.wavecache.next = 'clips/' + this.nav.getNode(n).file;
            }
        }

        setCurrent(flag: boolean): void {
            var name = this.nav.getPlayableName();
            d3.select('#' + name).classed('current', flag);
        }
    }

    export function soundScapes(): void {
        var ss = new SoundScapes();
        ss.init();
        ss.go();
    }

}
