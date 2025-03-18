let data = [];
let meanHistory = [];
let meanValue;
let lineHistory = [];
const blue = ["#377eb8"];
const green = ["#4daf4a"];
const red = ["#e41a1c"];

// Fetch and process CSV data
document.addEventListener("DOMContentLoaded", async function () {
    // Ensure data is fully loaded before proceeding
    data = await getFoodPointsWithTwoHourLater();
    console.log("Loaded Data:", data);

    // Initialize the chart after data is loaded
    updateChart();
});

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

    // Select all SVG elements under the class `.histogram-content`
    d3.selectAll(".histogram-content svg").each(function () {
        const svg = d3.select(this)

        const margin = { top: 20, right: 30, bottom: 60, left: 10 };
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
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text("Maximum Glucose Change Within 2 Hrs (mg/dL)");
        }

        // Add y-axis label (if not already added)
        if (g.select(".y-axis-label").empty()) {
            g.append("text")
                .attr("class", "y-axis-label")
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 10)
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text("Count");
        }

    // Compute the mean glucose spike
    meanValue = d3.mean(filteredData, d => d.maxGlucoseSpike);
    const carbsFilter = document.getElementById("carbs").value;
    const sugarFilter = document.getElementById("sugar").value;
    const proteinFilter = document.getElementById("protein").value;

    // Create the current combination object
    const currentCombination = { carbs: carbsFilter, sugar: sugarFilter, protein: proteinFilter };

    // Check if the combination already exists in lineHistory
    const isDuplicate = lineHistory.some(entry =>
        entry.carbs === currentCombination.carbs &&
        entry.sugar === currentCombination.sugar &&
        entry.protein === currentCombination.protein
    );

    // Add the combination only if it's not a duplicate
    if (!isDuplicate) {
        lineHistory.push(filterDataByCombination(currentCombination));
    }

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
    updateMotionChart();
});
}

function updateMeanGraph() {
    // Set up dimensions and margins

    //sort the meanHistory array

// Select the SVG container or create it if it doesn't exist
d3.selectAll(".chart-container2").each(function () {
    let container = d3.select(this);
    let svg = container.select("svg");

    // Get the existing width and height of the SVG
    const svgWidth = +svg.attr("width");
    const svgHeight = +svg.attr("height");

    // Define margins and calculate inner width and height
    const margin = { top: 20, right: 40, bottom: 50, left: 10 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Check if the SVG has any child elements
    if (svg.select("*").empty()) {
        // Create the inner group if it doesn't exist
        svg = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Add x-axis group
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`);

        // Add y-axis group
        svg.append("g")
            .attr("class", "y-axis");

        // Add title (only once)
        svg.append("text")
            .attr("class", "chart-title")
            .attr("text-anchor", "middle")
            .attr("x", svgWidth / 2) // Centered horizontally
            .attr("y", margin.top / 2 - 10) // Positioned near the top
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Average Maximum Glucose Change Within 2 Hours");
    } else {
        // Select the inner group if the SVG already exists
        svg = svg.select("g");
    }

    // Sort the meanHistory array
    meanHistory.sort((a, b) => a.mean - b.mean);

    // Create scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(meanHistory, d => d.mean)]) // Domain based on max mean value
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(meanHistory.map(d => d.category)) // Categories as domain
        .range([0, height])
        .padding(0.2); // Add padding between bars

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
        .data(meanHistory);

    // Remove existing labels before updating
    svg.selectAll(".bar-label").remove();

    // Enter selection: Add new bars
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.category))
        .attr("width", d => x(d.mean))
        .attr("height", y.bandwidth())
        .attr("fill", d => getColor(d.mean)) // Use getColor to set the initial color
        .merge(bars) // Merge with the update selection
        .transition() // Apply transition to both new and existing bars
        .duration(1000)
        .attr("x", 0)
        .attr("y", d => y(d.category))
        .attr("width", d => x(d.mean))
        .attr("height", y.bandwidth())
        .attr("fill", d => getColor(d.mean)); // Update color dynamically using getColor

    // Exit selection: Remove bars that are no longer in the data
    bars.exit()
        .transition()
        .duration(1000)
        .attr("width", 0)
        .remove();

    // Add labels to bars after updating
    bars.enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.mean) + 5) // Position slightly to the right of the bar
        .attr("y", d => y(d.category) + y.bandwidth() / 2 + 4) // Center vertically
        .text(d => d.mean.toFixed(2)) // Display the mean value
        .style("font-size", "12px")
        .style("fill", "black");

    // Exit selection: Remove bars that are no longer in the data
    bars.exit()
        .transition()
        .duration(1000)
        .attr("width", 0)
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
    });
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

document.addEventListener("DOMContentLoaded", function () {
    // Pause/Resume Button Logic
    document.getElementById("pause-combinations").addEventListener("click", () => {
        const button = document.getElementById("pause-combinations");
        if (isPaused) {
            // Resume the interval
            interval = setInterval(() => {
                updateCombination();
            }, 1500); // 2 seconds interval
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

    // Attach event listener to the "Show Combinations" button
    document.getElementById("show-combinations").addEventListener("click", showCombinations);

    // Attach event listener to the "Reset Average" button
    document.getElementById("reset-average").addEventListener("click", function () {
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
        const currentCombination = { carbs: carbsFilter, sugar: sugarFilter, protein: proteinFilter };
        lineHistory.push(filterDataByCombination(currentCombination));

        updateMotionChart();
    });
});

function reset(){
    const svg = d3.select("#chart-container2").select("svg");
    svg.selectAll(".bar").remove(); // Remove all bars
    svg.selectAll(".label").remove(); // Remove all labels
    meanHistory = [];
    lineHistory = [];
    index = 0;
    // reset my filter to ALL

    document.getElementById("carbs").value = "all";
    document.getElementById("sugar").value = "all";
    document.getElementById("protein").value = "all";
    button = document.getElementById("pause-combinations");
    clearInterval(interval); // Pause the interval
    isPaused = true;
    button.textContent = "Resume"; // Update button text
    updateChart();

}



async function getFoodPointsWithTwoHourLater() {
    const datasetOptions = Array.from(document.querySelectorAll(".data-select option")).map(option => option.value);

    // Array to store results
    const results = [];

    for (const dataset of datasetOptions) {
        // Fetch and parse the dataset
        const data = await d3.csv(dataset);

        // Parse timestamps and filter valid glucose readings
        data.forEach(d => {
            d.Timestamp = new Date(d["Timestamp (YYYY-MM-DDThh:mm:ss)"]);
            d["Glucose Value (mg/dL)"] = +d["Glucose Value (mg/dL)"];
            d.total_carb = d.total_carb ? +d.total_carb : null;
            d.sugar = d.sugar ? +d.sugar : null;
            d.protein = d.protein ? +d.protein : null;
            d.logged_food = d.logged_food ? d.logged_food.trim() : "";
        });

        // Sort data by timestamp
        data.sort((a, b) => a.Timestamp - b.Timestamp);

        // Filter valid glucose readings
        const glucoseData = data.filter(d => !isNaN(d["Glucose Value (mg/dL)"]));

        // Use bisector to find the closest glucose reading
        const bisectTime = d3.bisector(d => d.Timestamp).left;

        // Process food data
        const foodData = data.filter(d => d.logged_food !== "").map(d => {
            const index = bisectTime(glucoseData, d.Timestamp);
            d["Glucose Value (mg/dL)"] = (index > 0) ? glucoseData[index - 1]["Glucose Value (mg/dL)"] : glucoseData[index]["Glucose Value (mg/dL)"];

            // Compute glucose values within 2 hours
            const twoHourLater = new Date(d.Timestamp.getTime() + 2 * 60 * 60 * 1000);
            const glucoseValuesWithinTwoHours = glucoseData
                .filter(g => g.Timestamp > d.Timestamp && g.Timestamp <= twoHourLater)
                .map(g => g["Glucose Value (mg/dL)"]);

            // Compute max glucose spike within 2 hours
            const glucoseChanges = glucoseValuesWithinTwoHours.map(glucose => glucose - d["Glucose Value (mg/dL)"]);
            const maxGlucoseSpike = glucoseChanges.length ? d3.max(glucoseChanges) : 0;

            return {
                logged_food: d.logged_food,
                timestamp: d.Timestamp,
                twoHourLater: twoHourLater,
                glucoseValuesWithinTwoHours: glucoseValuesWithinTwoHours, // Add glucose values array
                glucose: d["Glucose Value (mg/dL)"],
                totalCarbs: d.total_carb,
                sugar: d.sugar,
                protein: d.protein,
                maxGlucoseSpike: maxGlucoseSpike
            };
        });

        // Add processed food data to the results
        results.push(...foodData);
    }


    console.log(results);
    // Optionally, return the results for further processing
    return results;
}


function updateMotionChart() {
    // Select the motion-image container
    d3.selectAll(".motion-image").each(function () {
    let container = d3.select(this);
    let svg = container.select("svg");
    // Define a line generator

    
    if (svg.select("*").empty()) {
        svg = svg
            .style("border", "1px solid black");
            svg.append("text")
                .attr("class", "chart-title")
                .attr("text-anchor", "middle")
                .attr("x", 0) // Centered horizontally
                .attr("y", 0) // Positioned near the top
                .style("font-size", "18px")
                .style("font-weight", "bold")
                .text("Glucose Response Over Time by Meal Spike Category"); // Optional: Add a border for visibility
    }

    // Define margins and dimensions for the chart
    const margin = { top: 20, right: 10, bottom: 50, left: 50 }; // Increased bottom margin for the X-axis label
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    // Create a dedicated group for the motion chart
    let motionGroup = svg.select(".motion-group");
    if (motionGroup.empty()) {
        motionGroup = svg.append("g")
            .attr("class", "motion-group")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    const line = d3.line()
.x((d, i) => xScale(i)) // X is the time interval index
.y(d => yScale(d)) // Y is the glucose value
.defined(d => d !== null); // Skip null values
    // Define scales
    const xScale = d3.scaleLinear()
        .domain([0, 23]) // 24 intervals (0 to 23)
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([
            d3.min(lineHistory, d => d3.min(d.averagedGlucoseValues)), // Minimum glucose value across all combinations
            d3.max(lineHistory, d => d3.max(d.averagedGlucoseValues))  // Maximum glucose value across all combinations
        ])
        .range([height, 0]);

    // Add X-axis
    let xAxis = motionGroup.select(".x-axis");
    if (xAxis.empty()) {
        xAxis = motionGroup.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(12).tickFormat(d => `${d * 10}`));
    } else {
        xAxis.transition()
            .duration(1000)
            .call(d3.axisBottom(xScale).ticks(12).tickFormat(d => `${d * 10}`));
    }

    // Add X-axis label
    if (motionGroup.select(".x-axis-label").empty()) {
        motionGroup.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x",  600 / 2) // Center the label horizontally
            .attr("y", height + margin.bottom - 10) // Position below the X-axis
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Time Interval (Minutes)");
    }

    let yAxis = motionGroup.select(".y-axis");
    if (yAxis.empty()) {
        yAxis = motionGroup.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));
    } else {
        yAxis.transition()
            .duration(1000)
            .call(d3.axisLeft(yScale));
    }

    // Add Y-axis label
    if (motionGroup.select(".y-axis-label").empty()) {
        motionGroup.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2) // Center the label vertically
            .attr("y", -margin.left + 15) // Position to the left of the Y-axis
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Glucose Level (mg/dL)");
    }

    // Group lines by color
    const groupedLines = d3.group(lineHistory, d => getColor(d.meanMaxGlucoseSpike));

    // Calculate the average line for each group
    const averagedLines = Array.from(groupedLines, ([color, lines]) => {
        const averagedGlucoseValues = [];
        for (let i = 0; i < 24; i++) {
            const values = lines.map(line => line.averagedGlucoseValues[i]).filter(v => v !== null);
            const average = values.length > 0 ? d3.mean(values) : null;
            averagedGlucoseValues.push(average);
        }
        return { color, lines, averagedGlucoseValues };
    });

    // Bind data to paths
    const paths = motionGroup.selectAll(".line-path")
        .data(averagedLines, d => d.color); // Use color as the unique key for each group

    // Enter selection: Add new lines
    const enterPaths = paths.enter()
        .append("path")
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", d => d.color) // Use the group color
        .attr("stroke-width", 2)
        .attr("d", d => line(d.averagedGlucoseValues)) // Set the initial path
        .attr("stroke-dasharray", function () {
            const totalLength = this.getTotalLength();
            return `${totalLength} ${totalLength}`;
        })
        .attr("stroke-dashoffset", function () {
            const totalLength = this.getTotalLength();
            return totalLength;
        });

    // Merge enter and update selections
    enterPaths.merge(paths)
        .transition()
        .duration(1000)
        .ease(d3.easeLinear)
        .attr("d", d => line(d.averagedGlucoseValues))
        .attr("stroke-dashoffset", 0);

    // Exit selection: Remove lines that are no longer in the data
    paths.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    // Add labels for each line
    const labels = motionGroup.selectAll(".line-label")
        .data(averagedLines, d => d.color); // Use color as the unique key for each group

    // Enter selection: Add new labels
    const enterLabels = labels.enter()
        .append("text")
        .attr("class", "line-label")
        .attr("fill", d => d.color) // Red for red lines, black for others
        .attr("text-anchor", "start")
        .attr("x", d => xScale(23) + 5) // Position slightly to the right of the last point
        .attr("y", d => yScale(d.averagedGlucoseValues[23])) // Position at the last point of the line
        .style("font-size", "12px")
        .text(d => {
            if (d.color === red) {
                return `High Glucose Spike 41+ mg/dL`; // One label for all red lines
            } else if (d.color === blue) {
                return `Medium Glucose Spike 34-41 mg/dL`; // One label for all blue lines
            } else {
                return `Low Glucose Spike <34 mg/dL`; // One label for all green lines
            }
        });

    // Merge enter and update selections for labels
    enterLabels.merge(labels)
        .transition()
        .duration(1000)
        .attr("x", d => xScale(23) + 5)
        .attr("y", d => yScale(d.averagedGlucoseValues[23]))
        .text(d => {
            if (d.color === red) {
                return `High Glucose Spike 41+ mg/dL`; // One label for all red lines
            } else if (d.color === blue) {
                return `Medium Glucose Spike 34-41 mg/dL`; // One label for all blue lines
            } else {
                return `Low Glucose Spike <34 mg/dL`; // One label for all green lines
            }
        });

    // Exit selection: Remove labels that are no longer in the data
    labels.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();
    });
};


function filterDataByCombination(combination) {
    // Destructure the specific combination
    const { carbs, sugar, protein } = combination;

    // Filter the data based on the specific combination
    const filteredData = data.filter(d => {
        const carbsCondition = carbs === "all" || (carbs === "high" ? d.totalCarbs > thresholds.carbs : d.totalCarbs <= thresholds.carbs);
        const sugarCondition = sugar === "all" || (sugar === "high" ? d.sugar > thresholds.sugar : d.sugar <= thresholds.sugar);
        const proteinCondition = protein === "all" || (protein === "high" ? d.protein > thresholds.protein : d.protein <= thresholds.protein);

        return carbsCondition && sugarCondition && proteinCondition;
    });

    // Remove `0` values and only include arrays with a length of 24
    const validGlucoseValues = filteredData
        .map(d => d.glucoseValuesWithinTwoHours.filter(value => value > 0)) // Remove `0` values
        .filter(arr => arr.length === 24); // Only include arrays with a length of 24

    // Calculate the mean max glucose spike for the filtered data
    const meanMaxGlucoseSpike = validGlucoseValues.length > 0
        ? d3.mean(filteredData, d => d.maxGlucoseSpike)
        : 0;

    // Calculate the average glucose values for each of the 24 time intervals
    const averagedGlucoseValues = [];
    for (let i = 0; i < 24; i++) {
        const intervalValues = validGlucoseValues.map(arr => arr[i]); // Get the i-th value from each array
        const intervalAverage = intervalValues.length > 0
            ? d3.mean(intervalValues) // Calculate the mean for this interval
            : null; // Handle cases where no values exist for this interval
        averagedGlucoseValues.push(intervalAverage);
    }
    // add logged food too
    const loggedFood = filteredData.map(d => d.logged_food);

    // Return the filtered result for the specific combination
    return {
        carbs,
        sugar,
        protein,
        loggedFood,
        averagedGlucoseValues,
        meanMaxGlucoseSpike
    };
}



function getColor(meanValue) {
    if (meanValue < 34) {
        return green; // Below 34
    } else if (meanValue < 41) {
        return blue; // Between 34 and 41
    } else {
        return red; // 41 and above
    }
}




