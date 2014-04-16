/// <reference path="../typings/d3/d3.d.ts" />
/// <reference path="../typings/wavesurfer/wavesurfer.d.ts" />
"use strict";
var SoundScapes;
(function (_SoundScapes) {
    // Width and height variables for othe d3 graph.
    var width = 900, height = 600;

    var ClipNavigator = (function () {
        function ClipNavigator(graph) {
            this.graph = graph;
            this.node = 0;
            this.category = null;
            this.index = null;
        }
        ClipNavigator.prototype.next = function () {
            var _this = this, node = null;

            // console.log('next >>>', _this.node);
            this.graph.links.every(function (link) {
                // console.log('***', node, link.source.index, link.path, link.target.index);
                if (link.source.index === _this.node && link.path == 1) {
                    node = link.target.index;
                    return false;
                }
                return true;
            });
            _this.node = node;
            // console.log('next <<<', _this.node);
        };

        ClipNavigator.prototype.findPlayable = function () {
            var found = false, _this = this;

            this.index = null;

            // console.log('find >>>', _this.node, _this.index);
            if (this.category == null) {
                this.index = this.node;
                found = true;
            } else {
                var index = this.index;

                this.graph.links.every(function (link) {
                    // console.log('***', link.target.index, _this.node, link.source.category, _this.category);
                    if (link.target.index === _this.node) {
                        var subnode = link.source;

                        if (subnode.category === _this.category) {
                            index = subnode.index;
                            found = true;
                            return false;
                        }
                    }
                    return true;
                });

                this.index = index;
            }

            // console.log('find <<<', _this.node, _this.index, found);
            return found;
        };

        ClipNavigator.prototype.getPlayable = function () {
            return this.graph.nodes[this.index];
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

    var SoundScapes = (function () {
        function SoundScapes() {
            this.wavesurfer = Object.create(WaveSurfer);
            this.force = d3.layout.force().linkDistance(55).charge(-150).size([width, height]);
            this.svg = d3.select("#clips").append("svg").attr("width", width).attr("height", height);
        }
        SoundScapes.prototype.init = function () {
            this.wavesurfer.init({
                container: document.querySelector('#wave'),
                waveColor: 'rgba(0,0,0,0.25)',
                progressColor: 'rgb(0,0,0,0)',
                cursorColor: 'white',
                cursorWidth: '4'
            });
            this.wireEvents();
        };

        SoundScapes.prototype.wireEvents = function () {
            var _this = this;

            this.wireOptions();

            d3.select("#play").on("click", function () {
                _this.wavesurfer.playPause();
            });

            this.wavesurfer.on('ready', function () {
                _this.setCurrent(true);
                _this.wavesurfer.play();
            });
            this.wavesurfer.on('finish', function () {
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

                _this.loadPlayable();
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
                _this.loadPlayable();
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

        SoundScapes.prototype.loadPlayable = function () {
            this.wavesurfer.load('clips/' + this.nav.getPlayableFile());
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
