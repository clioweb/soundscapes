var wavesurfer = Object.create(WaveSurfer);

wavesurfer.init({
    container: document.querySelector('#wave'),
    waveColor: 'rgba(0,0,0,0.25)',
    progressColor: 'rgb(255,200, 0)',
    cursorColor: 'rgba(0,0,0,0.25)',
    cursorWidth: '3'
});

wavesurfer.on('ready', function () {
    wavesurfer.play();
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
    console.log(error);
    console.log(graph);
    force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

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
        .on("click", function(d) {
            wavesurfer.load('clips/'+d.file);
        });

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

