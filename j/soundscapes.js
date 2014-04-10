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
var force = d3.layout.force()
    .linkDistance(55)
    .charge(-150)
    .size([width, height]);

// Find the #clips div and append a SVG tag to it.
var svg = d3.select("#clips").append("svg")
    .attr("width", width)
    .attr("height", height);


// Set up a simple play/pause button for the player.
var button = d3.select('#play').on('click', function (e) {
    wavesurfer.playPause();
});

// Read our clips.json data to generate our graph and play audio.
d3.json("clips.json", function(error, graph) {
    //console.log(error);
    //console.log(graph);

    force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

    // Current node and category, for player.
    var currentNode = 0;
    var currentCategory = null;
    var index;

    var options = d3.selectAll('#options li')
                    .on('click', function() {
                        options.classed('current', false);
                        d3.select(this).classed('current', true);

                        if (index != null) {
                            id = graph.nodes[index].name;
                            d3.select('#'+id).classed('current', false);
                        }
                        var categoryOption = d3.select(this).attr('data-category');

                        if (categoryOption == 'all') {

                            currentCategory = null;

                        } else {

                            currentCategory = categoryOption;

                        }

                        // Get the file clip for the current node and category.
                        index = getIndexToPlay(currentNode, graph, currentCategory);

                        // Tell wavesurfer to load the file.
                        wavesurfer.load('clips/' + graph.nodes[index].file);
                        wavesurfer.on('ready', function () {
                            id = graph.nodes[index].name;
                            d3.select('#'+id).classed('current', true);
                            wavesurfer.play();
                        });

                    });

    // When wavesurfer is finished playing the file, we'll loop to the next one.
    wavesurfer.on('finish', function() {
            id = graph.nodes[index].name;
            d3.select('#'+id).classed('current', false);

        while (true) {
            currentNode = getNextNodeIndex(currentNode, graph);

            index = getIndexToPlay(currentNode, graph, currentCategory);

            if (index != null) {
                break;
            }

            if (currentNode == null) {
                return;
            }

        }

        wavesurfer.load('clips/' + graph.nodes[index].file);
        wavesurfer.on('ready', function () {
            id = graph.nodes[index].name;
            d3.select('#'+id).classed('current', true);
            wavesurfer.play();
        });

    });

    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", function(link) {
            if (link[ "path"] > 0) {
                return "link path" ;
            } else {
                return "link" ;
            }
        });

    var node = svg.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("id", function(d) {
            return d.name
        })
        .attr("r", function(d) {
            return 5 * d.weight;
        })
        .call(force.drag)

      node.append("title")
          .text(function(d) { return d.name; });

    force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    });
});

// Returns the index of the next node.
function getNextNodeIndex(currentIndex, data) {
    var nextIndex;
    var links = data.links;

    links.forEach(function(link) {
        if (link.source.index == currentIndex && link.path == 1) {
            nextIndex = link.target.index;
        }
    });

    return nextIndex;

}

// Function to get the file for a node.
function getIndexToPlay(index, data, category ) {
    var nodes, subnodeIndex;

    nodes = data.nodes;

    if (category == null) {
        subnodeIndex = index;
    } else {
        var links = data.links;

        links.forEach(function(link) {
            if (link.target.index == index) {
                var subnode = link.source;

                if (subnode.category == category) {
                    subnodeIndex = subnode.index;
                }
            }
        });
    }

    return subnodeIndex;
}


