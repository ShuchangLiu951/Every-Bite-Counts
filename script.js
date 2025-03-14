let data = [];
let meanHistory = [];
// Fetch and process CSV data
fetch('combination.csv')
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to load CSV file.");
        }
        return response.text();
    })
    .then(csvText => {
        const rows = csvText.trim().split("\n").slice(1); // Remove header
        rows.forEach(row => {
            const cols = row.split(",");
            if (cols.length >= 4) { // Ensure there are enough columns
                const parsedData = {
                    maxGlucoseSpike: parseFloat(cols[3]) ,  // Avoid NaN
                    totalCarbs: parseFloat(cols[4]),
                    sugar: parseFloat(cols[5]),
                    protein: parseFloat(cols[6])
                };
                data.push(parsedData);
            }
        });
        updateChart();
    })
    .catch(error => console.error("Error loading CSV:", error));

// Thresholds for filtering
const thresholds = { carbs: 10, sugar: 2.7, protein: 3.1 };

function filterData() {
    const carbsFilter = document.getElementById("carbs").value;
    const sugarFilter = document.getElementById("sugar").value;
    const proteinFilter = document.getElementById("protein").value;

    return data.filter(d => {
        return (carbsFilter === "all" || (carbsFilter === "high" ? d.totalCarbs > thresholds.carbs : d.totalCarbs <= thresholds.carbs)) &&
               (sugarFilter === "all" || (sugarFilter === "high" ? d.sugar > thresholds.sugar : d.sugar <= thresholds.sugar)) &&
               (proteinFilter === "all" || (proteinFilter === "high" ? d.protein > thresholds.protein : d.protein <= thresholds.protein));
    });
}

function updateChart() {
    const filteredData = filterData();
    const svg = d3.select("svg");
    svg.selectAll("*").remove(); // Clear previous chart

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Adjust domain to account for negative values
    const xMin = d3.min(filteredData, d => d.maxGlucoseSpike);
    const xMax = d3.max(filteredData, d => d.maxGlucoseSpike);

    const x = d3.scaleLinear()
        .domain([xMin, xMax]) // Adjusted for negative values
        .range([0, width]);

    const bins = d3.bin()
        .domain(x.domain())
        .thresholds(x.ticks(20))
        (filteredData.map(d => d.maxGlucoseSpike));

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)]) 
        .range([height, 0]);
    
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 2) // Adjust for space
        .style("font-size", "18px") // Increase font size
        .style("font-weight", "bold")
        .text("Change in Glucose (mg/dL)");

    // Add X-axis label
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 2) // Adjust for space
        .style("font-size", "18px") // Increase font size
        .style("font-weight", "bold")
        .text("Change in Glucose (mg/dL)");
    // Y-axis label 
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15) // Adjust for space
        .style("font-size", "18px") // Increase font size
        .style("font-weight", "bold")
        .text("Count of Food Items");

    // Compute the mean glucose spike
    const meanValue = d3.mean(filteredData, d => d.maxGlucoseSpike);
    const carbsFilter = document.getElementById("carbs").value;
    const sugarFilter = document.getElementById("sugar").value;
    const proteinFilter = document.getElementById("protein").value;

    // Store mean value with filter information
    if (!meanHistory.some(entry => entry.category === `Carbs: ${carbsFilter}, Sugar: ${sugarFilter}, Protein: ${proteinFilter}`)) {
        meanHistory.push({ 
            category: `Carbs: ${carbsFilter}, Sugar: ${sugarFilter}, Protein: ${proteinFilter}`, 
            mean: meanValue 
        });
    }
    meanHistory.push({ 
        category: `Carbs: ${carbsFilter}, Sugar: ${sugarFilter}, Protein: ${proteinFilter}`, 
        mean: meanValue 
    });
// Add Y-axis
g.append("g")
  .call(d3.axisLeft(y));

// Add X-axis
g.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(x));


    // Bind data
    let bars = g.selectAll("rect").data(bins);

    // ENTER: Create new bars
    bars.enter().append("rect")
        .attr("x", d => x(d.x0))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", height) // Start from bottom
        .attr("height", 0)
        .attr("fill", "steelblue")
        .on("mouseover", function (event, d) {
            const tooltip = document.getElementById("tooltip");
            tooltip.style.left = event.pageX + "px";
            tooltip.style.top = event.pageY - 30 + "px";
            tooltip.innerHTML = `Count: ${d.length}`;
            tooltip.style.visibility = "visible";
        })
        .on("mouseout", function () {
            document.getElementById("tooltip").style.visibility = "hidden";
        })
        .merge(bars) // Merge with existing bars
        .transition().duration(1000)
        .attr("y", d => y(d.length))
        .attr("height", d => height - y(d.length));

    // EXIT: Fade out old bars
    bars.exit()
        .transition().duration(500)
        .attr("y", height)
        .attr("height", 0)
        .remove();

    // ADD MEAN LINE (Handles negative values properly)
    g.append("line")
        .attr("x1", x(meanValue))
        .attr("x2", x(meanValue))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "red")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 2)
        .transition().duration(1000)
        .attr("x1", x(meanValue))
        .attr("x2", x(meanValue));

    // ADD MEAN LABEL (Position dynamically for negative values)
    g.append("text")
        .attr("x", x(meanValue) + 5)
        .attr("y", 20)
        .attr("fill", "red")
        .style("font-size", "12px")
        .text(`Mean: ${meanValue.toFixed(2)}`);
}



function updateMeanGraph() {
    const svgWidth = 500, svgHeight = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Create or select SVG for mean graph
    let meanSvg = d3.select("#meanGraph");
    if (meanSvg.empty()) {
        meanSvg = d3.select("body").append("svg")
            .attr("id", "meanGraph")
            .attr("width", svgWidth)
            .attr("height", svgHeight);
    }
    meanSvg.selectAll("*").remove(); // Clear previous chart

    const g = meanSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Define scales
    const xScale = d3.scaleBand()
        .domain(meanHistory.map((d, i) => i)) // Use index as category
        .range([0, width])
        .padding(0.2); // Space between bars

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(meanHistory, d => d.mean) + 5]) // Ensure space above bars
        .range([height, 0]);

    // Draw X and Y axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => `#${d + 1}`)); // Label bars by index

    g.append("g").call(d3.axisLeft(yScale));

    // Bind data to bars
    let bars = g.selectAll("rect").data(meanHistory);

    // ENTER: Create new bars
    bars.enter().append("rect")
        .attr("x", (d, i) => xScale(i))
        .attr("width", xScale.bandwidth())
        .attr("y", height) // Start from bottom
        .attr("height", 0)
        .attr("fill", "steelblue")
        .merge(bars)
        .transition().duration(1000)
        .attr("y", d => yScale(d.mean))
        .attr("height", d => height - yScale(d.mean));


    // EXIT: Remove old bars smoothly
    bars.exit()
        .transition().duration(500)
        .attr("y", height)
        .attr("height", 0)
        .remove();

    // ADD MEAN VALUE LABELS ON TOP OF BARS
    let labels = g.selectAll(".bar-label").data(meanHistory);

    labels.enter().append("text")
        .attr("class", "bar-label")
        .attr("x", (d, i) => xScale(i) + xScale.bandwidth() / 2)
        .attr("y", height)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "12px")
        .merge(labels)
        .transition().duration(1000)
        .attr("y", d => yScale(d.mean) - 5)
        .text(d => d.mean.toFixed(2));


    // EXIT: Remove old labels
    labels.exit().remove();
}















// // // // // // D3.js visualization comparing glucose levels with food intake over time, per subject
// D3.js visualization comparing glucose levels with food intake over time, per subject
/* const margin = { top: 50, right: 50, bottom: 50, left: 70 },
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

        // Compute max glucose spike within 2 hours
        const twoHourLater = new Date(d.Timestamp.getTime() + 2 * 60 * 60 * 1000);
        const glucoseChanges = glucoseData
            .filter(g => g.Timestamp > d.Timestamp && g.Timestamp <= twoHourLater)
            .map(g => g["Glucose Value (mg/dL)"] - d["Glucose Value (mg/dL)"]);

        d.maxGlucoseSpike = glucoseChanges.length ? d3.max(glucoseChanges) : 0;

        return d;
    });

    console.log(foodData)

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

        function exportFoodData() {
            if (!foodData || foodData.length === 0) {
                alert("No food data available to export.");
                return;
            }
        
            // Convert foodData to CSV format
            const csvHeader = ["logged_food", "Glucose Value (mg/dL)", "maxGlucoseSpike", "Total Carbs", "Sugar", "Protein"];
            const csvRows = foodData.map(d =>
                [ // Convert date to readable format
                    `"${d.logged_food}"`,       // Handle text safely
                    d["Glucose Value (mg/dL)"],
                    d.maxGlucoseSpike,
                    d.total_carb,
                    d.sugar,
                    d.protein
                ].join(",")
            );
        
            const csvContent = [csvHeader.join(","), ...csvRows].join("\n");
        
            // Create a Blob and download it as a CSV file
            const blob = new Blob([csvContent], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "food_data.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        
        // Attach event listener to the button
        document.getElementById("exportFoodData").addEventListener("click", exportFoodData);

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
}); */