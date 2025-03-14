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

    // Update mean graph
    updateMeanGraph();
}

function updateMeanGraph() {
    // Set up dimensions and margins
    const margin = { top: 20, right: 30, bottom: 40, left: 150 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    //sort the meanHistory array
    meanHistory.sort((a, b) => a.mean - b.mean);

    // Create scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(meanHistory, d => d.mean)]) // Domain based on max mean value
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(meanHistory.map(d => d.category)) // Categories as domain
        .range([0, height])
        .padding(0.2); // Add padding between bars (adjust value as needed)

    // Select the SVG container or create it if it doesn't exist
    let svg = d3.select("#chart-container").select("svg");

    if (svg.empty()) {
        // Create SVG container if it doesn't exist
        svg = d3.select("#chart-container")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Add x-axis group
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`);

        // Add y-axis group
        svg.append("g")
            .attr("class", "y-axis");
    } else {
        // Select the inner group if the SVG already exists
        svg = svg.select("g");
    }

    // Update x-axis
    svg.select(".x-axis")
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x).ticks(5));

    // Update y-axis
    svg.select(".y-axis")
        .transition()
        .duration(1000)
        .call(d3.axisLeft(y));

    // Bind data to bars
    const bars = svg.selectAll(".bar")
        .data(meanHistory, d => d.category); // Use category as the key for data binding

    // Enter selection: Add new bars
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.category))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.mean)) // Start with the current width
        .attr("fill", "steelblue")
        .merge(bars) // Merge with the update selection
        .transition() // Apply transition to both new and existing bars
        .duration(1000)
        .attr("y", d => y(d.category)) // Update position
        .attr("height", y.bandwidth()) // Ensure height matches the band
        .attr("width", d => x(d.mean)); // Update width

    // Exit selection: Remove bars that are no longer in the data
    bars.exit()
        .transition()
        .duration(1000)
        .attr("width", 0) // Shrink bars to width 0 before removing
        .remove();

    // Bind data to labels
    const labels = svg.selectAll(".label")
        .data(meanHistory, d => d.category); // Use category as the key for data binding

    // Enter selection: Add new labels
    labels.enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.mean) + 5)
        .attr("y", d => y(d.category) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "black")
        .text(d => d.mean.toFixed(2))
        .merge(labels) // Merge with the update selection
        .transition() // Apply transition to both new and existing labels
        .duration(1000)
        .attr("x", d => x(d.mean) + 5) // Update position
        .attr("y", d => y(d.category) + y.bandwidth() / 2)
        .text(d => d.mean.toFixed(2)); // Update text

    // Exit selection: Remove labels that are no longer in the data
    labels.exit()
        .transition()
        .duration(1000)
        .style("opacity", 0) // Fade out before removing
        .remove();
}