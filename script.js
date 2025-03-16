let data = [];
let meanHistory = [];
let meanValue;
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
                    protein: parseFloat(cols[6]),
                    loggedFood: cols[1]
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

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    // Select or create the main group container
    let g = svg.select("g");
    if (g.empty()) {
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    }

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

    // Update x-axis
    let xAxis = g.select(".x-axis");
    if (xAxis.empty()) {
        xAxis = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    }
    xAxis.transition().duration(1000).call(d3.axisBottom(x));

    // Update y-axis
    let yAxis = g.select(".y-axis");
    if (yAxis.empty()) {
        yAxis = g.append("g").attr("class", "y-axis");
    }
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    // Bind data to bars
    const bars = g.selectAll(".bar")
        .data(bins);

    // Enter selection: Add new bars
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0)) // Initial position
        .attr("y", height) // Start at the bottom
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1)) // Bar width
        .attr("height", 0) // Start with height 0
        .attr("fill", "steelblue")
        .merge(bars) // Merge with the update selection
        .transition() // Apply transition to both new and existing bars
        .duration(1000)
        .attr("x", d => x(d.x0)) // Update position
        .attr("y", d => y(d.length)) // Update height
        .attr("height", d => height - y(d.length)) // Update height
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1)); // Update width

    // Exit selection: Remove bars that are no longer in the data
    bars.exit()
        .transition()
        .duration(1000)
        .attr("y", height) // Shrink bars to the bottom
        .attr("height", 0) // Shrink height to 0
        .remove();

    // Add x-axis label (if not already added)
    if (g.select(".x-axis-label").empty()) {
        g.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("font-size", "12px")
            .text("Glucose Spike");
    }

    // Add y-axis label (if not already added)
    if (g.select(".y-axis-label").empty()) {
        g.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 10)
            .style("font-size", "12px")
            .text("Count");
    }

    // Compute the mean glucose spike
    meanValue = d3.mean(filteredData, d => d.maxGlucoseSpike);
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

    // Select or create the mean line
    let meanLine = g.selectAll(".mean-line").data([meanValue]);

    // Update the existing mean line
    meanLine
        .transition()
        .duration(1000)
        .attr("x1", x(meanValue))
        .attr("x2", x(meanValue))
        .attr("y1", 0)
        .attr("y2", height);

    // Enter selection: Add the mean line if it doesn't exist
    meanLine.enter()
        .append("line")
        .attr("class", "mean-line")
        .attr("x1", x(meanValue))
        .attr("x2", x(meanValue))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "red")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 2)
        .transition()
        .duration(1000)
        .attr("x1", x(meanValue))
        .attr("x2", x(meanValue));

    // Select or create the mean label
    let meanLabel = g.selectAll(".mean-label").data([meanValue]);

    // Update the existing mean label
    meanLabel
        .transition()
        .duration(1000)
        .attr("x", x(meanValue) + 5)
        .attr("y", 20)
        .text(`Mean: ${meanValue.toFixed(2)}`);

    // Enter selection: Add the mean label if it doesn't exist
    meanLabel.enter()
        .append("text")
        .attr("class", "mean-label")
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
    const margin = { top: 20, right: 40, bottom: 40, left: 200 };
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

// Generate all combinations of filters
function generateCombinations() {
    const carbsOptions = ["high", "low"]; // Skip "all"
    const sugarOptions = ["high", "low"]; // Skip "all"
    const proteinOptions = ["high", "low"]; // Skip "all"

    const combinations = [];
    carbsOptions.forEach(carbs => {
        sugarOptions.forEach(sugar => {
            proteinOptions.forEach(protein => {
                combinations.push({ carbs, sugar, protein });
            });
        });
    });
    return combinations;
}

let interval; // Store the interval ID
let isPaused = false; // Track whether the combinations are paused
let index = 0; // Move index outside to make it global

function showCombinations() {
    // Clear the mean graph and bars
    reset();
    const button = document.getElementById("pause-combinations");
    isPaused = false;
    button.textContent = "Pause"; // Reset button text
    index = 0;
    updateCombination();

    // Function to update the chart for the current combination

    // Start the interval
    clearInterval(interval); // Clear any existing interval
    interval = setInterval(updateCombination, 2000); // 2 seconds interval
}

function updateCombination() {
    const combinations = generateCombinations();
    if (index >= combinations.length) {
        clearInterval(interval); // Stop when all combinations are shown
        index = 0; // Reset index after finishing
        return;
    }

    // Update the filter values
    const { carbs, sugar, protein } = combinations[index];
    document.getElementById("carbs").value = carbs;
    document.getElementById("sugar").value = sugar;
    document.getElementById("protein").value = protein;

    // Update the chart with the current combination
    updateChart();

    index++;
}

// Pause/Resume Button Logic
document.getElementById("pause-combinations").addEventListener("click", () => {
    const button = document.getElementById("pause-combinations");
    if (isPaused) {
        // Resume the interval
        interval = setInterval(() => {
            updateCombination();
        }
        , 2000); // 2 seconds interval
        isPaused = false;
        button.textContent = "Pause"; // Update button text
        console.log('Resumed');
    } else {
        clearInterval(interval); // Pause the interval
        isPaused = true;
        button.textContent = "Resume"; // Update button text
        console.log('Paused');
    }
});

// Attach event listener to the button
document.getElementById("show-combinations").addEventListener("click", showCombinations);

function printLoggedFood() {
    const filteredData = filterData();
    const carbsFilter = document.getElementById("carbs").value;
    const sugarFilter = document.getElementById("sugar").value;
    const proteinFilter = document.getElementById("protein").value;

    return data.filter(d => {
        return (carbsFilter === "all" || (carbsFilter === "high" ? d.totalCarbs > thresholds.carbs : d.totalCarbs <= thresholds.carbs)) &&
               (sugarFilter === "all" || (sugarFilter === "high" ? d.sugar > thresholds.sugar : d.sugar <= thresholds.sugar)) &&
               (proteinFilter === "all" || (proteinFilter === "high" ? d.protein > thresholds.protein : d.protein <= thresholds.protein));
    });

    // Extract and print the logged food
}

document.getElementById("print-food").addEventListener("click", printLoggedFood);
function reset(){
    const svg = d3.select("#chart-container").select("svg");
    svg.selectAll(".bar").remove(); // Remove all bars
    svg.selectAll(".label").remove(); // Remove all labels
    meanHistory = [];
}

document.getElementById("reset-average").addEventListener("click", function() {
    reset();
    const carbsFilter = document.getElementById("carbs").value;
    const sugarFilter = document.getElementById("sugar").value;
    const proteinFilter = document.getElementById("protein").value;
    if (!meanHistory.some(entry => entry.category === `Carbs: ${carbsFilter}, Sugar: ${sugarFilter}, Protein: ${proteinFilter}`)) {
        meanHistory.push({ 
            category: `Carbs: ${carbsFilter}, Sugar: ${sugarFilter}, Protein: ${proteinFilter}`, 
            mean: meanValue 
        });
    }
    updateMeanGraph();
});