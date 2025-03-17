document.addEventListener("DOMContentLoaded", function () {
    const width = 500, height = 500, radius = 200;
    const numAxes = 5; 

    let selectedFoods = [];
    let allFoodData = []; 
    let topCarbsFoods = []; 
    let topSugarFoods = []; 
    const angleSlice = (Math.PI * 2) / numAxes;
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Assign different colors

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const scale = d3.scaleLinear()
        .domain([-10, 100]) // Adjusted for possible negative values
        .range([0, radius]);


        d3.csv("combination.csv").then(function(data) {
            allFoodData = data.map(d => ({
                food: d["logged_food"],
                spike: +d["maxGlucoseSpike"]
            }));
        
            // 🎯 Select Top 5 Unique Foods by Total Carbs
            topCarbsFoods = [];
            let seenCarbs = new Set();
            data.sort((a, b) => +b["Total Carbs"] - +a["Total Carbs"])
                .forEach(d => {
                    if (!seenCarbs.has(d["logged_food"]) && topCarbsFoods.length < 5) {
                        topCarbsFoods.push({ food: d["logged_food"], spike: +d["maxGlucoseSpike"] });
                        seenCarbs.add(d["logged_food"]);
                    }
                });
        
            // 🎯 Select Top 5 Unique Foods by Sugar
            topSugarFoods = [];
            let seenSugar = new Set();
            data.sort((a, b) => +b["Sugar"] - +a["Sugar"])
                .forEach(d => {
                    if (!seenSugar.has(d["logged_food"]) && topSugarFoods.length < 5) {
                        topSugarFoods.push({ food: d["logged_food"], spike: +d["maxGlucoseSpike"] });
                        seenSugar.add(d["logged_food"]);
                    }
                });
        
            updateDropdown();
        });
        
        

    // 🎯 FUNCTION TO UPDATE DROPDOWN BASED ON SELECTED FEATURE
    function updateDropdown() {
        let selectedCategory = [];
        if (d3.select("#filter-carbs").property("checked")) {
            selectedCategory = topCarbsFoods;
        }
        if (d3.select("#filter-sugar").property("checked")) {
            selectedCategory = topSugarFoods;
        }

        d3.select("#dropdown-menu").selectAll("div").remove();

        const dropdownMenu = d3.select("#dropdown-menu")
            .selectAll("div")
            .data(selectedCategory)
            .enter()
            .append("div")
            .attr("class", "dropdown-item")
            .html(d => `
                <input type="checkbox" class="food-checkbox" value="${d.food}">
                <label>${d.food}</label>
            `);

        d3.selectAll(".food-checkbox").on("change", function () {
            selectedFoods = d3.selectAll(".food-checkbox:checked")
                              .nodes()
                              .map(d => d.value);
            updateDropdownButtonText();
        });

        updateDropdownButtonText();
    }


    function updateChart() {
        svg.selectAll("*").remove();// Clear previous chart
        d3.select("#legend-container").selectAll("*").remove(); // Clear previous legend

        // Filter data based on selected foods
        const selectedCategory = d3.select("#filter-carbs").property("checked") ? topCarbsFoods : topSugarFoods;
    const foodData = selectedCategory.filter(d => selectedFoods.includes(d.food));

        

        // Draw polygonal grid
        const gridLevels = [0, 25, 50, 75, 100];
        gridLevels.forEach(level => {
            const points = d3.range(numAxes).map((_, i) => {
                const r = scale(level);
                return [
                    r * Math.cos(i * angleSlice - Math.PI / 2),
                    r * Math.sin(i * angleSlice - Math.PI / 2)
                ];
            });

            svg.append("polygon")
                .attr("points", points.map(d => d.join(",")).join(" "))
                .attr("fill", "none")
                .attr("stroke", "#ccc");
        });

        // Add radial lines
        svg.selectAll(".radial-line")
            .data(d3.range(numAxes))
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", d => radius * Math.cos(d * angleSlice - Math.PI / 2))
            .attr("y2", d => radius * Math.sin(d * angleSlice - Math.PI / 2))
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);

        // Define the radar shape generator
        const radarLine = d3.line()
            .x((d, i) => scale(d.spike) * Math.cos(i * angleSlice - Math.PI / 2))
            .y((d, i) => scale(d.spike) * Math.sin(i * angleSlice - Math.PI / 2))
            .curve(d3.curveLinearClosed);

        // Append radar shape with animation
        svg.append("path")
            .datum(foodData)
            .attr("d", radarLine)
            .attr("stroke", "blue")
            .attr("fill", "lightblue")
            .attr("opacity", 0.6)
            .attr("stroke-width", 2)
            .attr("stroke-linejoin", "round")
            .attr("d", radarLine(foodData.map(d => ({ food: d.food, spike: 0 })))) // Start with zero values
            .transition()
            .duration(1500) // Animation duration
            .attr("d", radarLine);

        // Add data points with animation & tooltips
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ddd")
            .style("padding", "8px")
            .style("font-size", "14px")
            .style("box-shadow", "2px 2px 5px rgba(0,0,0,0.3)")
            .style("display", "none");

        svg.selectAll(".data-point")
            .data(foodData)
            .enter()
            .append("circle")
            .attr("cx", 0) // Start from center
            .attr("cy", 0)
            .attr("r", 5)
            .attr("fill", (d) => colorScale(d.food))
            .on("mouseover", function (event, d) {
                tooltip.style("display", "block")
                    .html(`<strong>${d.food}</strong><br>Glucose Spike: ${d.spike} mg/dL`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("display", "none");
            })
            .transition()
            .delay((d, i) => i * 300) // Stagger animation for each point
            .duration(1000)
            .attr("cx", (d, i) => scale(d.spike) * Math.cos(i * angleSlice - Math.PI / 2))
            .attr("cy", (d, i) => scale(d.spike) * Math.sin(i * angleSlice - Math.PI / 2));

        // Add food names at the vertices
        svg.selectAll(".food-label")
            .data(foodData)
            .enter()
            .append("text")
            .attr("x", (d, i) => (radius + 20) * Math.cos(i * angleSlice - Math.PI / 2))
            .attr("y", (d, i) => (radius + 20) * Math.sin(i * angleSlice - Math.PI / 2))
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text(d => d.food);

        // Add legend
        const legend = d3.select("#legend-container").selectAll(".legend-item")
            .data(foodData)
            .enter()
            .append("div")
            .attr("class", "legend-item")
            .style("display", "flex")
            .style("align-items", "center")
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                selectedFoods = selectedFoods.includes(d.food)
                    ? selectedFoods.filter(f => f !== d.food)
                    : [...selectedFoods, d.food];
                updateChart();
            });

        legend.append("div")
            .style("width", "12px")
            .style("height", "12px")
            .style("background-color", d => colorScale(d.food))
            .style("margin-right", "8px");

        legend.append("span").text(d => d.food);
    }

    const dropdownMenu = d3.select("#dropdown-menu")
        .selectAll("div")
        .data(allFoodData)
        .enter()
        .append("div")
        .attr("class", "dropdown-item")
        .html(d => `
            <input type="checkbox" class="food-checkbox" value="${d.food}">
            <label>${d.food}</label>
        `);

    // 🎯 TOGGLE DROPDOWN MENU VISIBILITY
    d3.select("#dropdown-button").on("click", function () {
        d3.select("#dropdown-menu").classed("show", !d3.select("#dropdown-menu").classed("show"));
    });

    // 🎯 CLOSE DROPDOWN IF CLICKING OUTSIDE
    document.addEventListener("click", function (event) {
        if (!event.target.closest("#dropdown-container")) {
            d3.select("#dropdown-menu").classed("show", false);
        }
    });

    // 🎯 UPDATE selectedFoods WHEN CHECKBOXES CHANGE
    d3.selectAll(".food-checkbox").on("change", function () {
        selectedFoods = d3.selectAll(".food-checkbox:checked")
                          .nodes()
                          .map(d => d.value);
        updateDropdownButtonText(); // Update button label
    });

    // 🎯 UPDATE DROPDOWN BUTTON TEXT TO SHOW SELECTIONS
    function updateDropdownButtonText() {
        let label = "Select Foods ▼";
        if (selectedFoods.length > 0) {
            label = selectedFoods.slice(0, 2).join(", ") + (selectedFoods.length > 2 ? "..." : "") + " ▼";
        }
        d3.select("#dropdown-button").text(label);
    }

    // 🎯 HANDLE FEATURE SELECTION (ONLY ONE CAN BE SELECTED)
d3.selectAll("#filter-carbs, #filter-sugar").on("change", function () {
    // If "Top 5 Total Carbs" is selected, uncheck "Top 5 Sugar"
    if (this.id === "filter-carbs" && this.checked) {
        d3.select("#filter-sugar").property("checked", false);
    }
    // If "Top 5 Sugar" is selected, uncheck "Top 5 Total Carbs"
    if (this.id === "filter-sugar" && this.checked) {
        d3.select("#filter-carbs").property("checked", false);
    }
    
    updateDropdown(); // Refresh dropdown based on the selected feature
    updateDropdownButtonText(); // Update button label
});


    
    d3.select("#update-chart").on("click", function () {
        updateChart();
    });
    // 🎯 RESET FUNCTIONALITY
    // 🎯 RESET FUNCTIONALITY
d3.select("#reset-chart").on("click", function () {
    selectedFoods = []; // Reset selected foods

    // 🎯 Uncheck all checkboxes in dropdown
    d3.selectAll(".food-checkbox").property("checked", false);

    // 🎯 Uncheck category selection
    d3.select("#filter-carbs").property("checked", false);
    d3.select("#filter-sugar").property("checked", false);

    // 🎯 Clear the dropdown menu
    d3.select("#dropdown-menu").selectAll("div").remove();

    // 🎯 Reset dropdown button text
    updateDropdownButtonText();

    // 🎯 Clear the chart
    updateChart();
});

});