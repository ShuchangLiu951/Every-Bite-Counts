// // // // // // D3.js visualization comparing glucose levels with food intake over time, per subject
// D3.js visualization comparing glucose levels with food intake over time, per subject
const margin = { top: 50, right: 50, bottom: 50, left: 70 },
    width = 900 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load data



function updateGraph(selectedFile) {
    console.log("Loading dataset:", selectedFile);
    d3.csv(selectedFile).then(data => {
        svg.selectAll("*").remove();
        data.forEach(d => {
            d.Timestamp = new Date(d["Timestamp (YYYY-MM-DDThh:mm:ss)"]);
            d["Glucose Value (mg/dL)"] = +d["Glucose Value (mg/dL)"];
            d.total_carb = d.total_carb ? +d.total_carb : null;
            d.sugar = d.sugar ? +d.sugar : null;
            d.protein = d.protein ? +d.protein : null;
            d.logged_food = d.logged_food ? d.logged_food.trim() : "";
        });
        data.sort((a, b) => a.Timestamp - b.Timestamp);

        const glucoseData = data.filter(d => !isNaN(d["Glucose Value (mg/dL)"]));
        const bisectTime = d3.bisector(d => d.Timestamp).left;

        const foodData = data.filter(d => d.logged_food !== "").map(d => {
            const index = bisectTime(glucoseData, d.Timestamp);
            d["Glucose Value (mg/dL)"] = (index > 0) ? glucoseData[index - 1]["Glucose Value (mg/dL)"] : glucoseData[index]["Glucose Value (mg/dL)"];
            return d;
        });

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(glucoseData, d => d.Timestamp))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(glucoseData, d => d["Glucose Value (mg/dL)"]),
                d3.max(glucoseData, d => d["Glucose Value (mg/dL)"])
            ]).nice()
            .range([height, 0]);

        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        const yAxis = svg.append("g").call(d3.axisLeft(y));

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .style("font-size", "18px") // Increase font size
            .style("font-weight", "bold")
            .text("Time");

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -50)
            .style("font-size", "18px") // Increase font size
            .style("font-weight", "bold")
            .text("Glucose (mg/dL)");

        // Line generator
        const line = d3.line()
            .x(d => x(d.Timestamp))
            .y(d => y(d["Glucose Value (mg/dL)"]));


        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        const glucosePath = svg.append("path")
            .datum(glucoseData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line)
            .attr("clip-path", "url(#clip)");

        // Add food intake points
        const foodPoints = svg.selectAll(".food-point")
            .data(foodData)
            .enter().append("circle")
            .attr("class", "food-point")
            .attr("cx", d => x(d.Timestamp))
            .attr("cy", d => y(d["Glucose Value (mg/dL)"]))
            .attr("r", 6)
            .attr("fill", "red")
            .attr("clip-path", "url(#clip)");

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "lightgray")
            .style("padding", "5px")
            .style("border-radius", "5px");

        function updateTooltip(event, d) {
                // Find glucose values within 1 hour after food consumption
            const twoHourLater = new Date(d.Timestamp.getTime() + 2 * 60 * 60 * 1000);
            const glucoseChanges = glucoseData.filter(g => g.Timestamp > d.Timestamp && g.Timestamp <= twoHourLater)
                .map(g => g["Glucose Value (mg/dL)"] - d["Glucose Value (mg/dL)"]);

        // Compute the highest glucose spike
            const maxGlucoseSpike = glucoseChanges.length ? d3.max(glucoseChanges) : 0;


            tooltip.style("visibility", "visible")
                .html(`
                    <strong>${d.logged_food}</strong><br>
                    Carbs: ${d.total_carb || 0}g<br>
                    Sugar: ${d.sugar || 0}g<br>
                    Protein: ${d.protein || 0}g<br>
                    <span style="color: red;"><strong>Max Glucose Change Within 2 Hours:</strong> ${maxGlucoseSpike.toFixed(1)} mg/dL</span>
                `)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`);
        }

        function hideTooltip() {
            tooltip.style("visibility", "hidden");
        }

        foodPoints
        .on("mouseenter", function (event, d) {
            d3.select(this).attr("r", 8).style("fill-opacity", 1);
            updateTooltip(event, d); // Enlarge circle
        })
        .on("mousemove", function (event) {
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseleave", function () {
            d3.select(this).attr("r", 6).style("fill-opacity", 0.7); // Restore size
            hideTooltip();
        });


        // Brush and zoom setup
        const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("end", brushed);

        const brushGroup = svg.append("g").attr("class", "brush").call(brush);
        svg.selectAll('.food-point, .overlay ~ *').raise();

        function brushed(event) {
            if (!event.selection) return;
            const [x0, x1] = event.selection.map(x.invert);
            x.domain([x0, x1]);
        
            // Update x-axis within valid bounds
            xAxis.transition().duration(1000).call(d3.axisBottom(x));
        
            // Update the glucose line and points within the clip path
            glucosePath.transition().duration(1000).attr("d", line);
            
            foodPoints.transition().duration(1000)
                .attr("cx", d => x(d.Timestamp))
                .attr("fill", d => (d.Timestamp >= x0 && d.Timestamp <= x1) ? "orange" : "red");


                    // Reapply tooltip event listeners after zoom
            foodPoints.on("mouseenter", function (event, d) {
                d3.select(this).attr("r", 8);
                updateTooltip(event, d);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mouseleave", function () {
                d3.select(this).attr("r", 6);
                hideTooltip();
            });
            
            brushGroup.call(brush.move, null);
        }
        // foodPoints.raise();
        d3.select("#reset-button").on("click", () => {
            x.domain(d3.extent(glucoseData, d => d.Timestamp));
            xAxis.transition().duration(1000).call(d3.axisBottom(x));
            glucosePath.transition().duration(1000).attr("d", line);
            foodPoints.transition().duration(1000).attr("cx", d => x(d.Timestamp)).attr("fill", "red");
        });

    });


}

document.addEventListener("DOMContentLoaded", function () {
    // Ensure the default dataset is loaded on page load
    updateGraph(document.getElementById("data-select").value);

    // Handle Dropdown Change
    document.getElementById("data-select").addEventListener("change", function () {
        updateGraph(this.value);
    });

    // Reset Zoom Function
    document.getElementById("reset-button").addEventListener("click", function () {
        updateGraph(document.getElementById("data-select").value);
    });
});