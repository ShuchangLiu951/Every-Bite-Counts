// // // // D3.js visualization comparing glucose levels with food intake over time, per subject
// // //draft 1
// D3.js visualization comparing glucose levels with food intake over time
const margin = { top: 50, right: 50, bottom: 50, left: 70 },
    width = 900 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load data
d3.csv("filtered data/number4_integrate.csv").then(data => {
    data.forEach(d => {
        d.Timestamp = new Date(d["Timestamp (YYYY-MM-DDThh:mm:ss)"]);
        d["Glucose Value (mg/dL)"] = +d["Glucose Value (mg/dL)"];
        d.total_carb = d.total_carb ? +d.total_carb : null;
        d.sugar = d.sugar ? +d.sugar : null;
        d.protein = d.protein ? +d.total_carb : null;

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
        .style("font-size", "14px")
        .text("Time");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .style("font-size", "14px")
        .text("Glucose (mg/dL)");

    // Line generator
    const line = d3.line()
        .x(d => x(d.Timestamp))
        .y(d => y(d["Glucose Value (mg/dL)"]));

    const glucosePath = svg.append("path")
        .datum(glucoseData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add food intake points
    const foodPoints = svg.selectAll(".food-point")
        .data(foodData)
        .enter().append("circle")
        .attr("class", "food-point")
        .attr("cx", d => x(d.Timestamp))
        .attr("cy", d => y(d["Glucose Value (mg/dL)"]))
        .attr("r", 6)
        .attr("fill", "red");

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "lightgray")
        .style("padding", "5px")
        .style("border-radius", "5px");

        // Tooltip logic
    function updateTooltip(event, d) {
        tooltip.style("visibility", "visible")
            .html(`
                <strong>${d.logged_food}</strong><br>
                Carbs: ${d.total_carb || 0}g<br>
                Sugar: ${d.sugar || 0}g<br>
                Protein: ${d.protein || 0}g
            `)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
    }

    foodPoints.on("mouseover", function (event, d) {
            d3.select(this).attr("r", 8);
            updateTooltip(event, d);
        })
        .on("mousemove", updateTooltip)
        .on("mouseout", function () {
            d3.select(this).attr("r", 6);
            hideTooltip();
        });
        

        function hideTooltip() {
            tooltip.style("visibility", "hidden");
        }
    // Food count display
    const foodCountText = d3.select("#food-count").text(`Total food items: ${foodData.length}`);

    // Brush and zoom setup
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", brushed);

    const brushGroup = svg.append("g").attr("class", "brush").call(brush);

    function brushed(event) {
        if (!event.selection) return;

        const [x0, x1] = event.selection.map(x.invert);
        x.domain([x0, x1]);

        // Update axes
        xAxis.transition().duration(1000).call(d3.axisBottom(x));

        // Update glucose line and circles
        glucosePath.transition().duration(1000).attr("d", line);
        
        foodPoints.transition().duration(1000)
            .attr("cx", d => x(d.Timestamp))
            .attr("fill", d => (d.Timestamp >= x0 && d.Timestamp <= x1) ? "orange" : "red"); 

        // Update food count in zoomed area
        const visibleFoodCount = foodData.filter(d => d.Timestamp >= x0 && d.Timestamp <= x1).length;
        foodCountText.text(`Food items in view: ${visibleFoodCount}`);

        // Ensure graph doesn't go outside axis
        brushGroup.call(brush.move, null);
    }

    // Zoom-out button
    d3.select("#reset-button").on("click", () => {
        x.domain(d3.extent(glucoseData, d => d.Timestamp));

        xAxis.transition().duration(1000).call(d3.axisBottom(x));
        glucosePath.transition().duration(1000).attr("d", line);

        foodPoints.transition().duration(1000)
            .attr("cx", d => x(d.Timestamp))
            .attr("fill", "red"); 

        foodCountText.text(`Total food items: ${foodData.length}`);
    });

});
