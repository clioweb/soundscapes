/// <reference path="../typings/d3/d3.d.ts" />
/// <reference path="../typings/wavesurfer/wavesurfer.d.ts" />
"use strict";
// Create a wavesurfer object.
var wavesurfer = Object.create(WaveSurfer);

// Set wavesurfer options.
wavesurfer.init({
    container: document.querySelector('#wave'),
    waveColor: 'rgba(0,0,0,0.25)',
    progressColor: 'rgb(0,0,0,0)',
    cursorColor: 'white',
    cursorWidth: '4'
});

// Width and height variables for othe d3 graph.
var width = 900, height = 600;

// Use the force...layout.
var force = d3.layout.force().linkDistance(55).charge(-150).size([width, height]);

// Find the #clips div and append a SVG tag to it.
var svg = d3.select("#clips").append("svg").attr("width", width).attr("height", height);

// Set up a simple play/pause button for the player.
var button = d3.select('#play').on('click', function (e) {
    wavesurfer.playPause();
});

// Read our clips.json data to generate our graph and play audio.
d3.json("clips.json", function (error, graph) {
    //console.log(error);
    //console.log(graph);
    window['graph'] = graph;
    force.nodes(graph.nodes).links(graph.links).start();

    // Current node and category, for player.
    var current = {
        node: 0,
        category: null,
        index: 0
    };

    var options = d3.selectAll('#options li').on('click', function () {
        options.classed('current', false);
        d3.select(this).classed('current', true);

        if (current.index != null) {
            var id = graph.nodes[current.index].name;
            d3.select('#' + id).classed('current', false);
        }

        var categoryOption = d3.select(this).attr('data-category');
        if (categoryOption == 'all') {
            current.category = null;
        } else {
            current.category = parseInt(categoryOption);
        }

        current.node = 0;
        findPlayableIndex(current, graph);
        loadCurrent(current, graph);
    });

    // When wavesurfer is finished playing the file, we'll loop to the next one.
    wavesurfer.on('ready', function () {
        var id = graph.nodes[current.index].name;

        d3.select('#' + id).classed('current', true);

        wavesurfer.play();
    });

    wavesurfer.on('finish', function () {
        var id = graph.nodes[current.index].name;
        d3.select('#' + id).classed('current', false);

        current.index = null;
        while (true) {
            moveToNextNode(current, graph);
            if (findPlayableIndex(current, graph)) {
                break;
            }
            if (current.node == null) {
                return;
            }
        }

        loadCurrent(current, graph);
    });

    var link = svg.selectAll(".link").data(graph.links).enter().append("line").attr("class", function (link) {
        if (link["path"] > 0) {
            return "link path";
        } else {
            return "link";
        }
    });

    var node = svg.selectAll(".node").data(graph.nodes).enter().append("circle").attr("class", "node").attr("id", function (d) {
        return d.name;
    }).attr("r", function (d) {
        return 5 * d.weight;
    }).call(force.drag);

    node.append("title").text(function (d) {
        return d.name;
    });

    force.on("tick", function () {
        link.attr("x1", function (d) {
            return d.source.x;
        }).attr("y1", function (d) {
            return d.source.y;
        }).attr("x2", function (d) {
            return d.target.x;
        }).attr("y2", function (d) {
            return d.target.y;
        });

        node.attr("cx", function (d) {
            return d.x;
        }).attr("cy", function (d) {
            return d.y;
        });
    });
});

// Returns the index of the next node.
function moveToNextNode(pos, data) {
    logPosition('moveToNextNode', pos);
    var node = pos.node, links = data.links;

    links.forEach(function (link) {
        if (link.source.index == pos.node && link.path == 1) {
            node = link.target.index;
        }
    });

    pos.node = node;
}

// Function to get the file for a node.
function findPlayableIndex(pos, data) {
    logPosition("findPlayableIndex", pos);
    var nodes = data.nodes, found = false;

    if (pos.category == null) {
        pos.index = pos.node;
        found = true;
    } else {
        var index = pos.index, links = data.links;

        links.forEach(function (link) {
            if (link.target.index === pos.node) {
                var subnode = link.source;

                if (subnode.category === pos.category) {
                    index = subnode.index;
                    found = true;
                }
            }
        });

        pos.index = index;
    }

    return found;
}

function loadCurrent(pos, graph) {
    console.log('loadCurrent', pos.index, pos);
    wavesurfer.load('clips/' + graph.nodes[pos.index].file);
}

function logPosition(msg, pos) {
    console.log(msg, pos.node, pos.category, pos.index);
}
//# sourceMappingURL=soundscapes.js.map
