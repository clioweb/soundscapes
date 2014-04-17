/// <reference path="../typings/d3/d3.d.ts" />
/// <reference path="../typings/wavesurfer/wavesurfer.d.ts" />
"use strict";
var SoundScapes;
(function (_SoundScapes) {
    // Width and height variables for the d3 graph.
    var width = 900, height = 600;

    var ClipNavigator = (function () {
        function ClipNavigator(graph) {
            this.graph = graph;
            this.node = 0;
            this.category = null;
            this.index = null;
        }
        ClipNavigator.prototype.getNext = function (n) {
            var here = (n == null) ? this.node : n, node = null;
            this.graph.links.every(function (link) {
                if (link.source.index === here && link.path == 1) {
                    node = link.target.index;
                    return false;
                }
                return true;
            });
            return node;
        };

        ClipNavigator.prototype.next = function () {
            var n = this.getNext();
            if (n != null) {
                this.node = n;
            }
        };

        ClipNavigator.prototype.findPlayableFrom = function (n) {
            var _this = this, index = null, node = this.graph.nodes[n];

            if (this.category == null) {
                index = n;
            } else {
                this.graph.links.every(function (link) {
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
        };

        ClipNavigator.prototype.findPlayable = function () {
            var index = this.findPlayableFrom(this.node), found = false;

            if (index != null) {
                this.index = index;
                found = true;
            }

            return found;
        };

        ClipNavigator.prototype.findNextPlayable = function () {
            var playable = null, next = this.node, np;

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
        };

        ClipNavigator.prototype.getNode = function (i) {
            return this.graph.nodes[i];
        };

        ClipNavigator.prototype.getPlayable = function () {
            return this.getNode(this.index);
        };

        ClipNavigator.prototype.getPlayableFile = function () {
            return this.getPlayable().file;
        };

        ClipNavigator.prototype.getPlayableName = function () {
            return this.getPlayable().name;
        };

        ClipNavigator.prototype.rewind = function () {
            this.node = 0;
            this.index = null;
        };
        return ClipNavigator;
    })();
    _SoundScapes.ClipNavigator = ClipNavigator;

    var WaveCache = (function () {
        function WaveCache() {
            this.surfer = Object.create(WaveSurfer);
            this.next = null;
            this.cached = null;
        }
        WaveCache.prototype.init = function () {
            var _this = this;

            this.surfer.init({
                container: document.querySelector('#wave'),
                waveColor: 'rgba(0,0,0,0.25)',
                progressColor: 'rgb(0,0,0,0)',
                cursorColor: 'white',
                cursorWidth: '4'
            });
            this.surfer.on('ready', function () {
                _this.surfer.play();
                _this.cache();
            });
        };

        WaveCache.prototype.swap = function (file) {
            this.surfer.drawer.clearWave();
            this.surfer.loadBuffer(this.cached);
            this.next = (file != null) ? 'clips/' + file : null;
        };

        WaveCache.prototype.on = function (eventName, handler) {
            var _this = this;
            this.surfer.on(eventName, function (e) {
                handler(e, _this.surfer);
            });
        };

        WaveCache.prototype.once = function (eventName, handler) {
            var _this = this;
            this.surfer.once(eventName, function (e) {
                handler(e, _this.surfer);
            });
        };

        WaveCache.prototype.cache = function (link) {
            var _this = this, xhr;

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
        };
        return WaveCache;
    })();
    _SoundScapes.WaveCache = WaveCache;

    var SoundScapes = (function () {
        function SoundScapes() {
            this.wavecache = new WaveCache();
            this.force = d3.layout.force().linkDistance(55).charge(-150).size([width, height]);
            this.svg = d3.select("#clips").append("svg").attr("width", width).attr("height", height);
        }
        SoundScapes.prototype.init = function () {
            this.wavecache.init();
            this.wireEvents();
        };

        SoundScapes.prototype.wireEvents = function () {
            var _this = this;

            this.wireOptions();

            d3.select("#play").on("click", function () {
                _this.wavecache.surfer.playPause();
            });

            this.wavecache.once('ready', function (e, ws) {
                _this.setCurrent(true);
                ws.play();
                _this.queueNextPlayable();
            });
            this.wavecache.on('finish', function (e, ws) {
                _this.setCurrent(false);
                _this.nav.index = null;
                while (true) {
                    _this.nav.next();
                    if (_this.nav.findPlayable()) {
                        break;
                    }
                    if (_this.nav.node == null) {
                        return;
                    }
                }

                var next = _this.nav.findNextPlayable();
                if (next != null) {
                    _this.wavecache.swap(_this.nav.getNode(next).file);
                    _this.setCurrent(true);
                }
            });
        };

        SoundScapes.prototype.go = function () {
            var _this = this;
            d3.json("clips.json", function (error, graph) {
                _this.onData(error, graph);
            });
        };

        SoundScapes.prototype.startForce = function () {
            this.force.nodes(this.graph.nodes).links(this.graph.links).start();
        };

        SoundScapes.prototype.wireOptions = function () {
            var _this = this;
            var options = d3.selectAll('#options li').on('click', function () {
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

                _this.nav.findPlayable();
                _this.loadCurrentPlayable();
                _this.queueNextPlayable();
            });
        };

        SoundScapes.prototype.drawGraph = function () {
            this.link = this.svg.selectAll(".link").data(this.graph.links).enter().append("line").attr("class", function (link) {
                if (link["path"] > 0) {
                    return "link path";
                } else {
                    return "link";
                }
            });

            this.node = this.svg.selectAll(".node").data(this.graph.nodes).enter().append("circle").attr("class", "node").attr("id", function (d) {
                return d.name;
            }).attr("r", function (d) {
                return 5 * d.weight;
            }).call(this.force.drag);

            this.node.append("title").text(function (d) {
                return d.name;
            });
        };

        SoundScapes.prototype.wireForce = function () {
            var _this = this;
            this.force.on("tick", function () {
                _this.link.attr("x1", function (d) {
                    return d.source.x;
                }).attr("y1", function (d) {
                    return d.source.y;
                }).attr("x2", function (d) {
                    return d.target.x;
                }).attr("y2", function (d) {
                    return d.target.y;
                });

                _this.node.attr("cx", function (d) {
                    return d.x;
                }).attr("cy", function (d) {
                    return d.y;
                });
            });
        };

        SoundScapes.prototype.onData = function (error, graph) {
            window['graph'] = graph;
            this.graph = graph;
            this.nav = new ClipNavigator(graph);

            this.startForce();
            this.drawGraph();
            this.wireForce();
        };

        SoundScapes.prototype.loadCurrentPlayable = function () {
            this.wavecache.surfer.load('clips/' + this.nav.getPlayableFile());
        };

        SoundScapes.prototype.queueNextPlayable = function (n) {
            if (n == null) {
                n = this.nav.findNextPlayable();
            }
            if (n != null) {
                this.wavecache.next = 'clips/' + this.nav.getNode(n).file;
            }
        };

        SoundScapes.prototype.setCurrent = function (flag) {
            var name = this.nav.getPlayableName();
            d3.select('#' + name).classed('current', flag);
        };
        return SoundScapes;
    })();
    _SoundScapes.SoundScapes = SoundScapes;

    function soundScapes() {
        var ss = new SoundScapes();
        ss.init();
        ss.go();
    }
    _SoundScapes.soundScapes = soundScapes;
})(SoundScapes || (SoundScapes = {}));
//# sourceMappingURL=soundscapes.js.map
