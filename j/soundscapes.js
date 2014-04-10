var wavesurfer = Object.create(WaveSurfer);

wavesurfer.init({
    container: document.querySelector('#wave'),
    waveColor: 'rgba(0,0,0,0.25)',
    progressColor: 'rgb(0,0,0,0)',
    cursorColor: 'white',
    cursorWidth: '4'
});

wavesurfer.on('ready', function () {
    wavesurfer.play();
});

var button = document.querySelector('#play');

button.addEventListener('click', function (e) {
    wavesurfer.playPause();
});

var width = 900, height = 600;

var force = d3.layout.force()
    .linkDistance(55)
    .charge(-150)
    .size([width, height]);

var svg = d3.select("#clips").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.json("clips.json", function(error, graph) {
    //console.log(error);
    //console.log(graph);    

    var currentNode = 0;
    var currentCategory = 3;

    force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

    var file = getFileForIndex(currentNode, graph, currentCategory);

    wavesurfer.load('clips/' + file);

    wavesurfer.on('finish', function() {

        while (true) {
            currentNode = getNextNodeIndex(currentNode, graph);
            
            file = getFileForIndex(currentNode, graph, currentCategory);

            if (file != null) {
                break;
            }

            if (currentNode == null) {
                return;
            }

        }

        wavesurfer.load('clips/' + file);
        
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

function getNextNodeIndex(currentIndex, data) {

    var nextIndex;

    var links = data.links;

    links.forEach(function(link) {

        //console.log(link.source);
    
        if (link.source.index == currentIndex && link.path == 1) {

            nextIndex = link.target.index;
        
        }

    });

    // Find the next node relative to the current clip.
    //
    // If the currentClip has a category, find the next clip with the same
    // category.



    return nextIndex;

}

function getFileForIndex(index, data, category ) {

    var file, nodes;

    nodes = data.nodes;

    if (category == null) {

        file = nodes[index].file

    } else {

        var links = data.links;

        links.forEach(function(link) {

            if (link.target.index == index) {

                var subnode = link.source;

                if (subnode.category == category) {

                    console.log(subnode.index);

                    file = subnode.file;

                }

            }

        }); 

    }

    return file;

}
