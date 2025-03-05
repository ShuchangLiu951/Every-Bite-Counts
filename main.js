

// D3.js visualization comparing glucose levels with food intake over time

const margin = { top: 50, right: 50, bottom: 50, left: 70 },
      width = 900 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

Promise.all([
    d3.csv("data/Dexcom_001.csv", d3.autoType),
    d3.csv("data/Food_Log_001.csv", d3.autoType)
]).then(([dexcomData, foodLogData]) => {
    // Parse timestamps and convert glucose values
    dexcomData.forEach(d => {
        d.Timestamp = new Date(d.Timestamp);
        d["Glucose Value (mg/dL)"] = +d["Glucose Value (mg/dL)"]; // Convert to number
    });

    // Exclude the first 11 rows and filter out entries with missing glucose values
    dexcomData = dexcomData.slice(11).filter(d => !isNaN(d["Glucose Value (mg/dL)"]));

    // Parse and filter food log data
    foodLogData.forEach(d => {
        d.time_begin = new Date(d.time_begin);
        d.total_carb = +d.total_carb; // Convert to number
    });

    // Filter out food log items with missing carbohydrate values
    foodLogData = foodLogData.filter(d => !isNaN(d.total_carb) && d.logged_food);

    // Group data by subject (if applicable)
    const subjects = d3.groups(dexcomData, d => d.Subject || "All");

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(dexcomData, d => d.Timestamp))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(dexcomData, d => d["Glucose Value (mg/dL)"]),
            d3.max(dexcomData, d => d["Glucose Value (mg/dL)"])
        ]).nice()
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

    // Add food intake points
    const foodPoints = svg.selectAll(".food-point")
        .data(foodLogData)
        .enter().append("circle")
        .attr("class", "food-point")
        .attr("cx", d => x(d.time_begin))
        .attr("cy", height) // Start from bottom
        .attr("r", d => Math.sqrt(d.total_carb) * 2) // Size based on carb content
        .attr("fill", "red")
        .transition()
        .duration(1000)
        .attr("cy", d => y(d3.mean(dexcomData.map(p => p["Glucose Value (mg/dL)"])))); // Use mean of glucose values

    // Tooltip for food items
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip") 
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
            d3.select(this).attr("r", Math.sqrt(d.total_carb) * 2);
            tooltip.style("visibility", "hidden");
        });
});
