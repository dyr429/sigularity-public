
var percent = (function() {
        var fmt = d3.format(".2f");
        return function(n) { return fmt(n) + "%"; };
    })(),
    fields = [
        {name: "(no scale)", id: "none"},
        {name: "Population Estimate", id: "9am", key: "9%d"},
        {name: "Population Change", id: "10am", key: "10%d", format: "+,"},
        {name: "Births", id: "11am", key: "11%d"},
        {name: "Deaths", id: "12pm", key: "12%d"},
        {name: "Natural Increase", id: "1pm", key: "13%d", format: "+,"},
        {name: "Int'l Migration", id: "2pm", key: "14%d", format: "+,"},
        {name: "Domestic Migration", id: "3pm", key: "15%d", format: "+,"},
        {name: "Net Migration", id: "4pm", key: "16%d", format: "+,"},
        {name: "Residual", id: "5pm", key: "17%d", format: "+,"},
        {name: "Birth Rate", id: "6pm", key: "18%d", format: "+,"},
        {name: "Death Rate", id: "7pm", key: "19%d", format: "+,"},
        {name: "Natural Increase Rate", id: "8pm", key: "20%d", format: "+,"},
        {name: "Int'l Migration Rate", id: "9pm", key: "21%d", format: "+,"},
        {name: "Net Domestic Migration Rate", id: "10pm", key: "22%d", format: "+,"},
        {name: "Net Migration Rate", id: "11pm", key: "23%d", format: "+,"}
    ],
    attributes = ["SUM", "PERCENT", "SA"],
    fieldsById = d3.nest()
        .key(function(d) { return d.id; })
        .rollup(function(d) { return d[0]; })
        .map(fields),
    field = fields[1],
    attribute = attributes[0],
    colorYear = attributes[0],
    shapeYear = attributes[0],
    colors = d3.schemeBlues[4]
        .map(function(rgb) { return d3.hsl(rgb); });

var smallMultiple=[];

var barchartDrawn = false;

var body = d3.select("body"),
    stat = d3.select("#status");

var fieldSelect = d3.select("#ex1")
    .on("change", function(e) {
        field = fields[this.value];
        location.hash = "#" + [field.id, attribute].join("/");
        var output = document.getElementById("IndicatorRaw");
        output.innerHTML = currentKey;

    });

fieldSelect.selectAll("range")
    .data(fields)
    .enter()
    .append("range")
    .attr("value", function(d) { return d.id; })
    .text(function(d) { return d.name; });

var attributeSelect = d3.select("#year")
    .on("change", function(e) {
        attribute = attributes[this.selectedIndex];
        location.hash = "#" + [field.id, attribute].join("/");
    });

attributeSelect.selectAll("range")
    .data(attributes)
    .enter()
    .append("range")
    .attr("value", function(y) { return y; })
    .text(function(y) { return y; });

var map = d3.select("#map"),
    layer = map.append("g")
        .attr("id", "layer"),
    states = layer.append("g")
        .attr("id", "states")
        .selectAll("path");

var statesArray;

var translation = [-38, 32],
    scaling = 0.94;

layer.attr("transform",
    "translate(" + translation + ")" +
    "scale(" + scaling + ")");

var proj = d3.geoAlbersUsa(),
    topology,
    geometries,
    rawData,
    dataById = {},
    carto = d3.cartogram()
        .projection(proj)
        .properties(function(d) {
            return dataById.get(d.id);
        })
        .value(function(d) {
            return +d.properties[field];
        });

window.onhashchange = function() {
    parseHash();
};

var segmentized = location.search === "?segmentized",
    url = ["data",
        segmentized ? "us-states-segmentized.topojson" : "us-states.topojson"
    ].join("/");

d3.json(url, function(topo) {
    var dataURL = document.getElementById('dataurl').value;
    topology = topo;
    geometries = topology.objects.states.geometries;
    d3.csv(dataURL, function(data) {
        rawData = data;
        dataById = d3.nest()
            .key(function(d) { return d.NAME; })
            .rollup(function(d) { return d[0]; })
            .map(data);
        init();
    });
});

function init() {

    ///init cartogram
    var features = carto.features(topology, geometries),
        path = d3.geoPath()
            .projection(proj);

    states = states.data(features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("id", function(d) {
            return d.properties.NAME;
        })
        .attr("fill", "#fafafa")
        .attr("d", path);

    states.append("title");

    statesArray = states.data()
        .map(function(d){return d.properties["NAME"];});
    ////init bar


}

function reset() {
    stat.text("");
    body.classed("updating", false);

    var features = carto.features(topology, geometries),
        path = d3.geoPath()
            .projection(proj);

    states.data(features)
        .transition()
        .duration(750)
        .ease(d3.easeLinear)
        .attr("fill", "#fafafa")
        .attr("d", path);

    states.select("title")
        .text(function(d) {
            return d.properties.NAME;
        });
}

var currentValue,currentKey;

function update() {
    var start = Date.now();
    body.classed("updating", true);

    //default color is based on SUM
    colorYear === 'undefined' ? colorYear = attribute[0] : colorYear;
    shapeYear === 'undefined' ? shapeYear = attribute[0] : shapeYear;

    var key = field.key.replace("%d", shapeYear),
        fmt = (typeof field.format === "function")
            ? field.format
            : d3.format(field.format || ","),
        value = function(d) {
            return +d.properties[key];
        },
        values = states.data()
            .map(value)
            .filter(function(n) {
                return !isNaN(n);
            }),
        lo = Math.min.apply(Math, values),
        hi = Math.max.apply(Math, values),
        colorKey = field.key.replace("%d", colorYear),
        colorValue = function(d){
            return +d.properties[colorKey];
        };

    currentValue = values;
    currentKey = key;

    var colorValues = states.data()
            .map(colorValue)
            .filter(function(n) {
                return !isNaN(n);
        }),
        colorLo = Math.min.apply(Math, colorValues),
        colorHi = Math.max.apply(Math, colorValues)
        ;

    document.getElementById("IndicatorRaw").innerHTML = currentKey;

    var color = d3.scaleLinear()
        .range(colors)
        .domain( colorLo < 0
            ? [ colorLo, 0, colorHi]
            : [ colorLo, d3.mean( colorValues), colorHi]);

    // normalize the scale to positive numbers
    var scale = d3.scaleLinear()
        .domain([lo, hi])
        .range([1, 1000]);

    // tell the cartogram to use the scaled values
    carto.value(function(d) {
        return scale(value(d));
    });

    // generate the new features, pre-projected
    var features = carto(topology, geometries).features;

    // update the data
    states.data(features)
        .select("title")
        .text(function(d) {
            return [d.properties.NAME, fmt(value(d))].join(": ");
        });

    states.transition()
        .duration(750)
        .ease(d3.easeLinear)
        .attr("fill", function(d) {
            return color( colorValue(d));
        })
        .attr("d", carto.path);

    var delta = (Date.now() - start) / 1000;
    stat.text(["calculated in", delta.toFixed(1), "seconds"].join(" "));
    body.classed("updating", false);

    //drawBarChart();
    //update bar
    if (barchartDrawn) {
        updateBars(values, false);
    }

    setAnnotation();

}

var deferredUpdate = (function() {
    var timeout;
    return function() {
        var args = arguments;
        clearTimeout(timeout);
        stat.text("calculating...");
        return timeout = setTimeout(function() {
            update.apply(null, arguments);
        }, 10);
    };
})();


var hashish = d3.selectAll("a.hashish")
    .datum(function() {
        return this.href;
    });

function parseHash() {
    var parts = location.hash.substr(1).split("/"),
        desiredFieldId = parts[0],

    field = fieldsById.get(desiredFieldId) || fields[1];
    attribute = (attributes.indexOf(shapeYear) > -1) ? shapeYear : attributes[0];

    fieldSelect.property("selectedIndex", fields.indexOf(field));

    if (field.id === "none") {

        attributeSelect.attr("disabled", "disabled");
        reset();

    } else {

        if (field.attributes) {
            if (field.attributes.indexOf(attribute) === -1) {
                attribute = field.attributes[0];
            }
            attributeSelect.selectAll("option")
                .attr("disabled", function(y) {
                    return (field.attributes.indexOf(y) === -1) ? "disabled" : null;
                });
        } else {
            attributeSelect.selectAll("option")
                .attr("disabled", null);
        }

        attributeSelect
            .property("selectedIndex", attributes.indexOf(attribute))
            .attr("disabled", null);

        deferredUpdate();
        location.replace("#" + [field.id, attribute].join("/"));

        hashish.attr("href", function(href) {
            return href + location.hash;
        });
    }
}


//use this to change what attribute encodes color; default is sum
var tabulateColor = function (data) {
    colorYear = attributes[data];

    parseHash();
}

var tabulateShape = function (data) {
    shapeYear = attributes[data];

    parseHash();
}

var animationPlay;
var playStatus = false;
function tick(){
    var sliderControl = document.getElementById("ex1");
    field = fields[sliderControl.value];
    location.hash = "#" + [field.id, attribute].join("/");
    var output = document.getElementById("Indicator");
    output.innerHTML = sliderControl.value;
}
function startPlay() {
    if(!playStatus){
        playStatus = true;
        animationPlay = setInterval(function(){
            var value = +(document.getElementById("ex1").value) + 1;
            if(value <= document.getElementById("ex1").max) {
                document.getElementById("ex1").value = value.toString();
                tick();
            }
            else{
                stopPlay();
                document.getElementById("ex1").value = "1";
                document.getElementById("Indicator").innerHTML = "1";
                document.getElementById("playButton").className = "play";
                playStatus = false;
                tick();

            }

        }, 1000);
    }
    else{
        stopPlay();
        playStatus = false;

    }
}

function stopPlay(){
    clearInterval(animationPlay);
}

function changeColor() {
    var c = document.getElementById("colorPick").value;
    if(c=="blue"){
        colors = d3.schemeBlues[4]
            .map(function(rgb) { return d3.hsl(rgb); });
    } else if(c=="green"){
        colors = d3.schemeGreens[4]
            .map(function(rgb) { return d3.hsl(rgb); });
    } else{
        colors = d3.schemeReds[4]
            .map(function(rgb) { return d3.hsl(rgb); });
    }
    parseHash();
}



// bar chart
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Load and munge data, then make the visualization.
var xScale,yScale,canvas,yAxisHandleForUpdate,yAxis,margin,width,height,tooltip,barBrush,bars;
var activeData = [];
var drawBarChart = function () {

         //statesArray = states.data()
           // .map(function(d){return d.properties["NAME"];});
        // Define dimensions of vis
         margin = { top: 30, right: 50, bottom: 100, left: 100 };
            width  = 800 - margin.left - margin.right;
            height = 800 - margin.top  - margin.bottom;

        // Make x scale
        xScale = d3.scaleBand()
            .domain(statesArray)
            .range([0, width]);

        // Make y scale, the domain will be defined on bar update
        yScale = d3.scaleLinear()
            .range([height, 0]);

        // Create canvas
        canvas = d3.select("#panel-right")
            .append("svg")
            .attr("width",  width  + margin.left + margin.right)
            .attr("height", height + margin.top  + margin.bottom)
            .attr("id","barvis")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Make x-axis and add to canvas
        var xAxis = d3.axisBottom(xScale);

        canvas.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .attr("y",0)
            .attr("x",9)
            .attr("transform","rotate(90)")
            .style("text-anchor","start")
            .style("font-size","12");

        // Make y-axis and add to canvas
        yAxis = d3.axisLeft(yScale);

        yAxisHandleForUpdate = canvas.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        yAxisHandleForUpdate.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Value");

        //brush
    // define brush
    barBrush = d3.brushX()
            .extent([[0,30],[width,height-10]])//(x0,y0)  (x1,y1)
            .on("end",barBrushEnd)
            .on("brush",highlightBrushedBars);//when mouse up, move the selection to the exact tick //start(mouse down), brush(mouse move), end(mouse up)

    canvas.append("g")
        .attr("class","brush")
        .call(barBrush);

     tooltip = d3.select("#panel-right").append("div").attr("class", "toolTip");


        var initialData = currentValue;
        updateBars(initialData,true);
        updateBars(initialData,true);

}


var updateBars = function(data,initial) {
    if(bars){
        bars.attr("class", "bar");
    }

    // First update the y-axis domain to match data
    yScale.domain( d3.extent(data) );
    yAxisHandleForUpdate.call(yAxis);

        bars = canvas.selectAll(".bar").data(data);


    var hoveredState;
    var previousColor;
    // Add bars for new data
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("fill","purple")

        .attr("x", function(d,i) { return xScale( statesArray[i] ); })
        .attr("width", xScale.bandwidth())
        .attr("y", function(d,i) { return yScale(d); })
        .attr("height", function(d,i) { return height - yScale(d); })
        .on("mouseover", function(d,i){
            //Where I'm having problems - getting the X attribute!
            var barPos = parseFloat(d3.select(this.parentNode).attr('transform').split("(")[1]);

            var xPosition = barPos + xScale(statesArray[i]) +20;
            var yPosition = parseFloat(d3.select(this).attr("y")) / 2 + height / 2;

            //Update the tooltip position and value
            tooltip
                .style("left", xPosition-60 + "px")
                .style("top", yPosition + "px")
                .html(statesArray[i] + " : "+ d)
                .style("display", "inline-block");
            //Show the tooltip

            hoveredState = states.filter(function (e){
                return statesArray[i]==e["id"];
            });
            previousColor=hoveredState.style("fill");
            hoveredState.attr("fill", "greenyellow");

        })
        .on("mouseout", function(d){
            tooltip.style("display", "none");
            hoveredState.attr("fill", previousColor);


        });

    // Update old ones, already have x / width from before
    bars
        .transition().duration(1000)
        .attr("y", function(d,i) { return yScale(d); })
        .attr("height", function(d,i) { return height - yScale(d); });

    // Remove old ones

     bars.exit().remove();
    if (activeData.length != 0) {
        bars.filter(function (d, i) {
            return activeData.includes(statesArray[i]);
        })
            .attr("class", "bar-brushed");
    }
};


function highlightBrushedBars() {


     states.attr("class", "state");
    activeData = [];

    if (d3.event.selection != null) {

        // revert circles to initial style
        bars.attr("class", "bar-non-brushed");

        var brush_coords = d3.brushSelection(d3.select("#barvis").select(".brush").node());


        // style brushed circles
        filtedBars = bars.filter(function (d,i){

            var cx = d3.select(this).attr("x");
            var brushed = isBarBrushed(brush_coords, cx);
            if(brushed){
                activeData.push(statesArray[i]);
            }
            return brushed;
        })
            .attr("class", "bar-brushed");


        console.log(activeData);

        states.filter(function (d){

            return activeData.includes(d["id"]);
        })
            .attr("class", "state-brushed");
    }

}

function isBarBrushed(brush_coords, cx) {

    var x0 = brush_coords[0],
        x1 = brush_coords[1];

    return x0 <= cx && cx <= x1;
}

function barBrushEnd(){
    // if (!d3.event.sourceEvent) return; // Only transition after input.
    // if (!d3.event.selection) return; // Ignore empty selections.
    // var areaArray = d3.event.selection;//[x0,x1]
    if (d3.event.selection != null) {

    }
    else{
 //       circles.attr("class", "circle-non-brushed");
        bars.attr("class", "bar");
        states.attr("class", "state");
        activeData=[];


    }
}

function initialBarChart() {
    var barchart = document.getElementById("barvis");
    if(barchart == null){
        drawBarChart();
        barchartDrawn = true;
    }

}


function addToSmallMultiple() {
    if(smallMultiple.includes(currentKey)){
       alert("already added");
    }
    else{
        smallMultiple.push(currentKey);

        var svgText = new XMLSerializer().serializeToString(document.getElementById("map"));
        var CanvasID = "canvas"+ smallMultiple.length.toString();
        var myCanvas = document.getElementById(CanvasID);
        var ctxt = myCanvas.getContext("2d");
        ctxt.font = "15px Arial";
        ctxt.fillText(smallMultiple[smallMultiple.length-1],10,50);
        drawInlineSVG(ctxt, svgText, function() {
            console.log(canvas.toDataURL());  // -> PNG
        });
    }



}




function drawInlineSVG(ctx, rawSVG, callback) {

    var svg = new Blob([rawSVG], {type:"image/svg+xml;charset=utf-8"}),
        domURL = self.URL || self.webkitURL || self,
        url = domURL.createObjectURL(svg),
        img = new Image;

    img.onload = function () {
        ctx.drawImage(img, -10, -10,800,500);
        domURL.revokeObjectURL(url);
        callback(this);
    };

    img.src = url;
}

function setAnnotation() {
    var timeinterval = document.getElementById('time-interval').value;
    var shapeAttr = document.getElementById('shapeAttr').value;
    var colorAttr = document.getElementById('colorAttr').value;
    var numb = currentKey.match(/\d/g);
    numb = numb.join("");
    document.getElementById("Indicator").innerHTML = timeinterval + '&nbsp' +":" + numb + "&nbsp" +
        ", Shape: " + shapeAttr + "&nbsp" + ",Color: " + colorAttr;

}

// function activaTab(tab){
//     $('.nav-tabs a[href="#' + tab + '"]').tab('show');
// };
// function submitData() {
//     reload_js("js/home.js")
//     activaTab('menu1');
// }
//
// function reload_js(src) {
//     $('script[src="' + src + '"]').remove();
//     $('<script>').attr('src', src).appendTo('head');
// }
