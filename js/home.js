// hide the form if the browser doesn't do SVG,
// (then just let everything else fail)
$("#panel-right").slideReveal({
    trigger: $("#trigger-right"),
    position: "right",
    width: 900
});

$("#panel-left").slideReveal({
    trigger: $("#trigger-left"),
    push: false,
    overlay: true,
    width:800
});

$('#trigger-right').on('click', function() {
    $("#container").toggleClass('side-mode');
});
if (!document.createElementNS) {
    document.getElementsByTagName("form")[0].style.display = "none";
}


// set initial value
var percent = (function() {
        var fmt = d3.format(".2f");
        return function(n) { return fmt(n) + "%"; };
    })(),
    fields = [
        {name: "(no scale)", id: "none"},
        // {name: "Census Population", id: "censuspop", key: "CENSUS%dPOP", years: [2010]},
        // {name: "Estimate Base", id: "censuspop", key: "ESTIMATESBASE%d", years: [2010]},
        {name: "Population Estimate", id: "popest", key: "POPESTIMATE%d"},
        {name: "Population Change", id: "popchange", key: "NPOPCHG_%d", format: "+,"},
        {name: "Births", id: "births", key: "BIRTHS%d"},
        {name: "Deaths", id: "deaths", key: "DEATHS%d"},
        {name: "Natural Increase", id: "natinc", key: "NATURALINC%d", format: "+,"},
        {name: "Int'l Migration", id: "intlmig", key: "INTERNATIONALMIG%d", format: "+,"},
        {name: "Domestic Migration", id: "domesticmig", key: "DOMESTICMIG%d", format: "+,"},
        {name: "Net Migration", id: "netmig", key: "NETMIG%d", format: "+,"},
        {name: "Residual", id: "residual", key: "RESIDUAL%d", format: "+,"},
        {name: "Birth Rate", id: "birthrate", key: "RBIRTH%d", years: [2011], format: percent},
        {name: "Death Rate", id: "deathrate", key: "RDEATH%d", years: [2011], format: percent},
        {name: "Natural Increase Rate", id: "natincrate", key: "RNATURALINC%d", years: [2011], format: percent},
        {name: "Int'l Migration Rate", id: "intlmigrate", key: "RINTERNATIONALMIG%d", years: [2011], format: percent},
        {name: "Net Domestic Migration Rate", id: "domesticmigrate", key: "RDOMESTICMIG%d", years: [2011], format: percent},
        {name: "Net Migration Rate", id: "netmigrate", key: "RNETMIG%d", years: [2011], format: percent},
    ],
    years = [2010, 2011],
    fieldsById = d3.nest()
        .key(function(d) { return d.id; })
        .rollup(function(d) { return d[0]; })
        .map(fields),
    field = fields[0],
    year = years[0],
    colors = d3.schemeBlues[4]
        .map(function(rgb) { return d3.hsl(rgb); });





var body = d3.select("body"),
    stat = d3.select("#status");

var fieldSelect = d3.select("#ex1")
    .on("change", function(e) {
        field = fields[this.value];
        location.hash = "#" + [field.id, year].join("/");
        var output = document.getElementById("Indicator");
        output.innerHTML = this.value;
    });



fieldSelect.selectAll("range")
    .data(fields)
    .enter()
    .append("range")
    .attr("value", function(d) { return d.id; })
    .text(function(d) { return d.name; });

var yearSelect = d3.select("#year")
    .on("change", function(e) {
        year = years[this.selectedIndex];
        location.hash = "#" + [field.id, year].join("/");
    });

yearSelect.selectAll("range")
    .data(years)
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
    topology = topo;
    geometries = topology.objects.states.geometries;
    d3.csv("data/nst_2011.csv", function(data) {
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

    parseHash();

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
var statesArray,currentValue;
function update() {
    var start = Date.now();
    body.classed("updating", true);

    var key = field.key.replace("%d", year),
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
        lo = Math.min.apply(Math, values);
        hi = Math.max.apply(Math, values);
        currentValue = values;
        statesArray = states.data()
            .map(function(d){return d.properties["NAME"];});

    var color = d3.scaleLinear()
        .range(colors)
        .domain(lo < 0
            ? [lo, 0, hi]
            : [lo, d3.mean(values), hi]);

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
            return color(value(d));
        })
        .attr("d", carto.path);

    var delta = (Date.now() - start) / 1000;
    stat.text(["calculated in", delta.toFixed(1), "seconds"].join(" "));
    body.classed("updating", false);

    //update bar
    updateBars(values);

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
        desiredYear = +parts[1];

    field = fieldsById.get(desiredFieldId) || fields[0];
    year = (years.indexOf(desiredYear) > -1) ? desiredYear : years[0];

    fieldSelect.property("selectedIndex", fields.indexOf(field));

    if (field.id === "none") {

        yearSelect.attr("disabled", "disabled");
        reset();

    } else {

        if (field.years) {
            if (field.years.indexOf(year) === -1) {
                year = field.years[0];
            }
            yearSelect.selectAll("option")
                .attr("disabled", function(y) {
                    return (field.years.indexOf(y) === -1) ? "disabled" : null;
                });
        } else {
            yearSelect.selectAll("option")
                .attr("disabled", null);
        }

        yearSelect
            .property("selectedIndex", years.indexOf(year))
            .attr("disabled", null);

        deferredUpdate();
        location.replace("#" + [field.id, year].join("/"));

        hashish.attr("href", function(href) {
            return href + location.hash;
        });
    }
}


//TODO DI
var tabulate = function (data,columns) {
    var table = d3.select('#panel-left').append('table')
    var thead = table.append('thead')
    var tbody = table.append('tbody')

    thead.append('tr')
        .selectAll('th')
        .data(columns)
        .enter()
        .append('th')
        .text(function (d) { return d })
        .append("input")
        .attr("type", "checkbox")
        .style("float","left")

    var rows = tbody.selectAll('tr')
        .data(data)
        .enter()
        .append('tr')

    var cells = rows.selectAll('td')
        .data(function(row) {
            return columns.map(function (column) {
                return { column: column, value: row[column] }
            })
        })
        .enter()
        .append('td')
        .text(function (d) { return d.value })

    return table;
}

d3.csv('https://gist.githubusercontent.com/dyr429/28115a3ee46500e761c0a4fcd16482ca/raw/ac9eb57fd76c11df6f6505b0802dffd29926a1c6/tweets_sample',function (data) {
    // append table test
    var columns = ['State','Hour','Content']
    tabulate(data,columns)
})

var animationPlay;
var playStatus = false;
function tick(){
    var sliderControl = document.getElementById("ex1");
    field = fields[sliderControl.value];
    location.hash = "#" + [field.id, year].join("/");
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
var xScale,yScale,canvas,yAxisHandleForUpdate,yAxis,margin,width,height,tooltip;
var drawBarChart = function () {
        // Define dimensions of vis
         margin = { top: 30, right: 50, bottom: 100, left: 50 };
            width  = 800 - margin.left - margin.right;
            height = 1000 - margin.top  - margin.bottom;

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

     tooltip = d3.select("#panel-right").append("div").attr("class", "toolTip");


        var initialData = currentValue;
        updateBars(initialData);

}


var updateBars = function(data) {
    // First update the y-axis domain to match data
    yScale.domain( d3.extent(data) );
    yAxisHandleForUpdate.call(yAxis);

    var bars = canvas.selectAll(".bar").data(data);

    // Add bars for new data
    bars.enter()
        .append("rect")
        .attr("class", "bar")
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
                .style("left", xPosition + "px")
                .style("top", yPosition + "px")
                .html(statesArray[i] + " : "+ d)
                .style("display", "inline-block");
            //Show the tooltip
        })
        .on("mouseout", function(d){ tooltip.style("display", "none");});

    // Update old ones, already have x / width from before
    bars
        .transition().duration(1000)
        .attr("y", function(d,i) { return yScale(d); })
        .attr("height", function(d,i) { return height - yScale(d); });

    // Remove old ones
    // bars.exit().remove();
};
