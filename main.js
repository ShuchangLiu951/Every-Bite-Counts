// // D3.js visualization comparing glucose levels with food intake over time, per subject
//draft 1
// const margin = { top: 50, right: 50, bottom: 50, left: 70 },
//       width = 900 - margin.left - margin.right,
//       height = 500 - margin.top - margin.bottom;

// const svg = d3.select("#chart-container").append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//   .append("g")
//     .attr("transform", `translate(${margin.left},${margin.top})`);

// // Load data
// d3.csv("filtered data/number4_integrate.csv").then(data => {
//     // Parse data
//     data.forEach(d => {
//         d.Timestamp = new Date(d["Timestamp (YYYY-MM-DDThh:mm:ss)"]);
//         d["Glucose Value (mg/dL)"] = +d["Glucose Value (mg/dL)"];
//         d.total_carb = d.total_carb ? +d.total_carb : null;
//         d.logged_food = d.logged_food ? d.logged_food.trim() : "";
//     });

//     // Filter out rows with missing glucose values
//     const glucoseData = data.filter(d => !isNaN(d["Glucose Value (mg/dL)"]));

//     // Extract food intake events
//     const foodData = data.filter(d => d.logged_food !== "");

//     // Scales
//     const x = d3.scaleTime()
//         .domain(d3.extent(glucoseData, d => d.Timestamp))
//         .range([0, width]);

//     const y = d3.scaleLinear()
//         .domain([d3.min(glucoseData, d => d["Glucose Value (mg/dL)"]), 
//                  d3.max(glucoseData, d => d["Glucose Value (mg/dL)"])]).nice()
//         .range([height, 0]);

//     // Axes
//     svg.append("g")
//         .attr("transform", `translate(0,${height})`)
//         .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));

//     svg.append("g").call(d3.axisLeft(y));

//     // Line generator
//     const line = d3.line()
//         .x(d => x(d.Timestamp))
//         .y(d => y(d["Glucose Value (mg/dL)"]));

//     // Plot glucose line
//     svg.append("path")
//         .datum(glucoseData)
//         .attr("fill", "none")
//         .attr("stroke", "steelblue")
//         .attr("stroke-width", 2)
//         .attr("d", line);

//     // Add food intake points on the glucose line
//     const foodPoints = svg.selectAll(".food-point")
//         .data(foodData)
//         .enter().append("circle")
//         .attr("class", "food-point")
//         .attr("cx", d => x(d.Timestamp))
//         .attr("cy", d => y(d["Glucose Value (mg/dL)"]))
//         .attr("r", 6)
//         .attr("fill", "red");

//     // Tooltip
//     const tooltip = d3.select("body").append("div")
//         .style("position", "absolute")
//         .style("visibility", "hidden")
//         .style("background", "lightgray")
//         .style("padding", "5px")
//         .style("border-radius", "5px");

//     foodPoints.on("mouseover", function(event, d) {
//             d3.select(this).attr("r", 8);
//             tooltip.style("visibility", "visible")
//                 .text(`${d.logged_food} (${d.total_carb || 0}g carbs)`)
//                 .style("left", `${event.pageX}px`)
//                 .style("top", `${event.pageY}px`);
//         })
//         .on("mouseout", function() {
//             d3.select(this).attr("r", 6);
//             tooltip.style("visibility", "hidden");
//         });

// });

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
    // Parse data
    data.forEach(d => {
        d.Timestamp = new Date(d["Timestamp (YYYY-MM-DDThh:mm:ss)"]);
        d["Glucose Value (mg/dL)"] = +d["Glucose Value (mg/dL)"];
        d.total_carb = d.total_carb ? +d.total_carb : null;
        d.logged_food = d.logged_food ? d.logged_food.trim() : "";
    });

    // Sort data by timestamp to ensure correct lookup
    data.sort((a, b) => a.Timestamp - b.Timestamp);

    // Filter valid glucose data
    const glucoseData = data.filter(d => !isNaN(d["Glucose Value (mg/dL)"]));

    // Use d3.bisector to efficiently find the closest glucose value
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
        .domain([d3.min(glucoseData, d => d["Glucose Value (mg/dL)"]), 
                 d3.max(glucoseData, d => d["Glucose Value (mg/dL)"])]).nice()
        .range([height, 0]);

    // Axes
  
    // svg.append("g")
    // .attr("transform", `translate(0,${height})`)
    // .call(d3.axisBottom(x)
    //     .ticks(d3.timeHour.every(12)) // Set ticks every 12 hours
    //     .tickFormat(d3.timeFormat("%d %H:%M"))); // Show Day and Hour (e.g., "13 06:00")
// Extract unique days from timestamps
const uniqueDays = Array.from(new Set(glucoseData.map(d => {
    const date = new Date(d.Timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; // Format as YYYY-MM-DD
})));

const x2 = d3.scalePoint()
    .domain(uniqueDays.map((day, index) => `Day ${index + 1}`)) // Create Day labels
    .range([0, width]);

// Append the x-axis
svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x2));



    svg.append("g").call(d3.axisLeft(y));

    // Axis Labels
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("font-size", "14px")
        .text("Time of Day");

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

    // Plot glucose line
    svg.append("path")
        .datum(glucoseData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add food intake points on the glucose line
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

    foodPoints.on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            tooltip.style("visibility", "visible")
                .text(`${d.logged_food} (${d.total_carb || 0}g carbs)`)
                .style("left", `${event.pageX}px`)
                .style("top", `${event.pageY}px`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6);
            tooltip.style("visibility", "hidden");
        });

});
