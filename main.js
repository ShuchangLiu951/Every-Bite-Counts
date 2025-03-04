// D3.js visualization comparing glucose levels with food intake over time, per subject

const margin = { top: 50, right: 50, bottom: 50, left: 70 },
      width = 900 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

Promise.all([
    d3.csv("Dexcom_001.csv", d3.autoType),
    d3.csv("Food_Log_001.csv", d3.autoType)
]).then(([dexcomData, foodLogData]) => {
    // Parse timestamps
    dexcomData.forEach(d => d.Timestamp = new Date(d.Timestamp));
    foodLogData.forEach(d => d.time_begin = new Date(d.time_begin));

    // Group data by subject
    const subjects = d3.groups(dexcomData, d => d.Subject);

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(dexcomData, d => d.Timestamp))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(dexcomData, d => d["Glucose Value (mg/dL)"]), d3.max(dexcomData, d => d["Glucose Value (mg/dL)"])]).nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));
    
    svg.append("g").call(d3.axisLeft(y));

    // Line generator
    const line = d3.line()
        .x(d => x(d.Timestamp))
        .y(d => y(d["Glucose Value (mg/dL)"]));

    // Plot glucose lines per subject
    subjects.forEach(([subject, data]) => {
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", d3.schemeCategory10[subject % 10])
            .attr("stroke-width", 2)
            .attr("d", line);
    });

    // Add food intake points with animation
    const foodPoints = svg.selectAll(".food-point")
        .data(foodLogData)
        .enter().append("circle")
        .attr("class", "food-point")
        .attr("cx", d => x(d.time_begin))
        .attr("cy", height) // Start from bottom
        .attr("r", 5)
        .attr("fill", "red")
        .transition()
        .duration(1000)
        .attr("cy", d => y(d3.mean(dexcomData, p => p["Glucose Value (mg/dL)"])));

    // Tooltip for food items
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "lightgray")
        .style("padding", "5px");
    
    foodPoints.on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            tooltip.style("visibility", "visible")
                .text(`${d.logged_food} (${d.total_carb}g carbs)`)
                .style("left", `${event.pageX}px`)
                .style("top", `${event.pageY}px`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 5);
            tooltip.style("visibility", "hidden");
        });
    
    // Highlight glucose slope per food period
    foodLogData.forEach((d, i) => {
        if (i < foodLogData.length - 1) {
            let start = d.time_begin;
            let end = foodLogData[i + 1].time_begin;
            let subset = dexcomData.filter(d => d.Timestamp >= start && d.Timestamp <= end);
            if (subset.length > 1) {
                let slope = (subset[subset.length - 1]["Glucose Value (mg/dL)"] - subset[0]["Glucose Value (mg/dL)"]) / subset.length;
                svg.append("line")
                    .attr("x1", x(start))
                    .attr("y1", y(subset[0]["Glucose Value (mg/dL)"]))
                    .attr("x2", x(end))
                    .attr("y2", y(subset[subset.length - 1]["Glucose Value (mg/dL)"]))
                    .attr("stroke", "orange")
                    .attr("stroke-width", 2)
                    .on("mouseover", function() {
                        tooltip.style("visibility", "visible").text("Slope: " + slope.toFixed(2));
                    })
                    .on("mouseout", function() {
                        tooltip.style("visibility", "hidden");
                    });
            }
        }
    });
});