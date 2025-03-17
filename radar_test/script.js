document.addEventListener("DOMContentLoaded", function () {
    const margin = 50; 
const width = 600; 
const height = 600; 
const radius = 200; 
    const numAxes = 5; 

    let selectedFoods = [];
    let allFoodData = []; 
    let topCarbsFoods = []; 
    let topSugarFoods = []; 
    const angleSlice = (Math.PI * 2) / numAxes;
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // Assign different colors

    const svg = d3.select("#chart-container")
    .append("svg")
    .attr("width", width + margin * 2) 
    .attr("height", height + margin * 2)
    .style("pointer-events", "none") // 🔹 Prevents blocking clicks
    .append("g")
    .attr("transform", `translate(${(width + margin) / 2}, ${(height + margin) / 2})`); 

// 🎯 Apply pointer-events only on necessary elements
svg.selectAll("polygon, path, text")
    .style("pointer-events", "none");

    const scale = d3.scaleLinear()
        .domain([-10, 100]) // Adjusted for possible negative values
        .range([0, radius]);


        d3.csv("combination.csv").then(function(data) {
            allFoodData = data.map(d => ({
                food: d["logged_food"],
                spike: +d["maxGlucoseSpike"],
                totalCarbs: +d["Total Carbs"], // ✅ Store Total Carbs
                sugar: +d["Sugar"] // ✅ Store Sugar
            }));
        
            // 🎯 Select Top 5 Unique Foods by Total Carbs
            topCarbsFoods = [];
            let seenCarbs = new Set();
            data.sort((a, b) => +b["Total Carbs"] - +a["Total Carbs"])
                .forEach(d => {
                    if (!seenCarbs.has(d["logged_food"]) && topCarbsFoods.length < 5) {
                        topCarbsFoods.push({ 
                            food: d["logged_food"], 
                            spike: +d["maxGlucoseSpike"],
                            totalCarbs: +d["Total Carbs"]  // ✅ Ensure we keep Total Carbs
                        });
                        seenCarbs.add(d["logged_food"]);
                    }
                });
        
            // 🎯 Select Top 5 Unique Foods by Sugar
            topSugarFoods = [];
            let seenSugar = new Set();
            data.sort((a, b) => +b["Sugar"] - +a["Sugar"])
                .forEach(d => {
                    if (!seenSugar.has(d["logged_food"]) && topSugarFoods.length < 5) {
                        topSugarFoods.push({ 
                            food: d["logged_food"], 
                            spike: +d["maxGlucoseSpike"],
                            sugar: +d["Sugar"] // ✅ Ensure we keep Sugar
                        });
                        seenSugar.add(d["logged_food"]);
                    }
                });
        
            updateDropdown(); // ✅ Update dropdown after data is ready
            updateChart(); // ✅ Now we can call updateChart() after the data is available!
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
        // 🎯 Determine whether to show default or user-selected foods
        let foodData;
        if (!d3.select("#filter-carbs").property("checked") && !d3.select("#filter-sugar").property("checked")) {
            // 🎯 Default state: Show both Top 5 Total Carbs & Top 5 Sugar foods
            foodData = [...topCarbsFoods, ...topSugarFoods];
        } else {
            // 🎯 User-selected state: Show selected category only
            const selectedCategory = d3.select("#filter-carbs").property("checked") ? topCarbsFoods : topSugarFoods;
            foodData = selectedFoods.length > 0 ? selectedCategory.filter(d => selectedFoods.includes(d.food)) : selectedCategory;
        }
        

        

        // Draw polygonal grid
        // Draw polygonal grid with labels
const gridLevels = [0, 25, 50, 75, 100];
gridLevels.forEach(level => {
    const r = scale(level);
    
    // Draw grid polygon
    const points = d3.range(numAxes).map((_, i) => [
        r * Math.cos(i * angleSlice - Math.PI / 2),
        r * Math.sin(i * angleSlice - Math.PI / 2)
    ]);

    svg.append("polygon")
        .attr("points", points.map(d => d.join(",")).join(" "))
        .attr("fill", "none")
        .attr("stroke", "#ccc");

    // 🎯 Add labels only on the vertical (first) axis
    svg.append("text")
        .attr("x", 0)
        .attr("y", -r)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#555")
        .text(level);
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

            let isCarbsSelected = d3.select("#filter-carbs").property("checked");
let isSugarSelected = d3.select("#filter-sugar").property("checked");

// 🎯 Check if we are in default state (both unchecked)
let isDefaultState = !isCarbsSelected && !isSugarSelected;

// 🎯 Separate datasets for Carbs and Sugar
let carbsData = isDefaultState ? topCarbsFoods : (isCarbsSelected ? foodData : []);
let sugarData = isDefaultState ? topSugarFoods : (isSugarSelected ? foodData : []);

// 🎯 Append radar shape for Carbs (Blue)
if (carbsData.length > 0) {
    svg.append("path")
        .datum(carbsData)  
        .attr("d", radarLine)
        .attr("stroke", "blue")  
        .attr("fill", "lightblue")  
        .attr("opacity", 0.6)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("d", radarLine(carbsData.map(d => ({ food: d.food, spike: 0 })))) 
        .transition()
        .duration(1500)
        .attr("d", radarLine);
}

// 🎯 Append radar shape for Sugar (Red)
if (sugarData.length > 0) {
    svg.append("path")
        .datum(sugarData)  
        .attr("d", radarLine)
        .attr("stroke", "red")  
        .attr("fill", "pink")  
        .attr("opacity", 0.6)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("d", radarLine(sugarData.map(d => ({ food: d.food, spike: 0 })))) 
        .transition()
        .duration(1500)
        .attr("d", radarLine);
}


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
            .style("pointer-events", "auto")
            .on("mouseover", function (event, d) {
                let selectedCategory = d3.select("#filter-carbs").property("checked") ? topCarbsFoods : topSugarFoods;
                let foodItem = allFoodData.find(item => item.food === d.food);
                
                let additionalInfo = "";
                if (d3.select("#filter-carbs").property("checked")) {
                    additionalInfo = `<br>Total Carbs: ${foodItem ? foodItem.totalCarbs : "N/A"} g`;
                } else if (d3.select("#filter-sugar").property("checked")) {
                    additionalInfo = `<br>Sugar: ${foodItem ? foodItem.sugar : "N/A"} g`;
                }
            
                tooltip.style("display", "block")
                    .html(`<strong>${d.food}</strong><br>Glucose Spike: ${d.spike} mg/dL${additionalInfo}`)
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
        // 🎯 Group food names by axis to prevent overlap
const axisFoodMap = {}; 

foodData.forEach((d, i) => {
    const axisIndex = i % numAxes; // Map foods to the same axis
    if (!axisFoodMap[axisIndex]) {
        axisFoodMap[axisIndex] = [];
    }
    axisFoodMap[axisIndex].push(d.food);
});

svg.selectAll(".food-label")
    .data(Object.entries(axisFoodMap)) // Use grouped data
    .enter()
    .append("text")
    .attr("x", ([axisIndex, foods]) => {
        let xPos = (radius + 50) * Math.cos(axisIndex * angleSlice - Math.PI / 2);
        return Math.max(-width / 2 + margin, Math.min(width / 2 - margin, xPos));
    })
    .attr("y", ([axisIndex, foods]) => {
        let yPos = (radius + 50) * Math.sin(axisIndex * angleSlice - Math.PI / 2);
        return Math.max(-height / 2 + margin, Math.min(height / 2 - margin, yPos));
    })
    .attr("text-anchor", ([axisIndex, foods]) => {
        const angle = axisIndex * angleSlice - Math.PI / 2;
        return angle > -Math.PI / 2 && angle < Math.PI / 2 ? "start" : "end";
    })
    .attr("alignment-baseline", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .style("fill", "black")
    .text(([axisIndex, foods]) => foods.join(" & ")) // 🎯 Merge names with "&"
    .call(wrapText, 120); // Ensure text wrapping



        // Add legend
        d3.select("#legend-container").selectAll("*").remove();

// 🎯 ADD CATEGORY LEGEND FOR CHART COLORS (BLUE = Total Carbs, RED = Sugar)
const categoryLegend = d3.select("#legend-container")
    .append("div")
    .attr("class", "category-legend")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("margin-bottom", "10px");

// 🎯 TOTAL CARBS (BLUE) LEGEND
categoryLegend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-right", "20px")
    .html(`
        <svg width="30" height="10">
            <line x1="0" y1="5" x2="30" y2="5" stroke="blue" stroke-width="3"></line>
        </svg>
        <span style="font-size: 14px; margin-left: 5px;">Total Carbs</span>
    `);

// 🎯 SUGAR (RED) LEGEND
categoryLegend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .html(`
        <svg width="30" height="10">
            <line x1="0" y1="5" x2="30" y2="5" stroke="red" stroke-width="3"></line>
        </svg>
        <span style="font-size: 14px; margin-left: 5px;">Sugar</span>
    `);

// 🎯 FORCE FOOD LEGEND TO A NEW LINE
d3.select("#legend-container").append("div")
    .style("width", "100%")
    .style("height", "1px"); // ✅ Forces new row

// 🎯 DETERMINE WHICH CATEGORIES TO DISPLAY
let showCarbs = d3.select("#filter-carbs").property("checked");
let showSugar = d3.select("#filter-sugar").property("checked");

// 🎯 SHOW BOTH CATEGORIES IF NEITHER CHECKBOX IS CHECKED
if (!showCarbs && !showSugar) {
    showCarbs = true;
    showSugar = true;
}

// 🎯 GET RELEVANT FOODS (KEEP DUPLICATES)
let carbsFoods = showCarbs ? topCarbsFoods : [];
let sugarFoods = showSugar ? topSugarFoods : [];

// 🎯 RENDER LEGEND FOR CARBS CATEGORY IF SELECTED
if (showCarbs) {
    const carbsLegend = d3.select("#legend-container").append("div")
        .attr("class", "legend-category")
        .style("margin-top", "10px") // ✅ Ensure spacing
        .html(`<strong>🍞 Foods in Top 5 Total Carbs:</strong>`);

    carbsLegend.selectAll(".legend-item")
        .data(carbsFoods)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("display", "inline-block")
        .style("margin-right", "15px")
        .html(d => `<span style="display:inline-block;width:12px;height:12px;background-color:${colorScale(d.food)};margin-right:5px;"></span> ${d.food}`);
}

// 🎯 RENDER LEGEND FOR SUGAR CATEGORY IF SELECTED
if (showSugar) {
    const sugarLegend = d3.select("#legend-container").append("div")
        .attr("class", "legend-category")
        .style("margin-top", "10px") // ✅ Ensure spacing
        .html(`<strong>🍬 Foods in Top 5 Sugar:</strong>`);

    sugarLegend.selectAll(".legend-item")
        .data(sugarFoods)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .style("display", "inline-block")
        .style("margin-right", "15px")
        .html(d => `<span style="display:inline-block;width:12px;height:12px;background-color:${colorScale(d.food)};margin-right:5px;"></span> ${d.food}`);
}

        



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
        // 🎯 If user selects a checkbox, clear default chart
        selectedFoods = [];
    
        // 🎯 Uncheck the other checkbox (only one can be selected)
        if (this.id === "filter-carbs" && this.checked) {
            d3.select("#filter-sugar").property("checked", false);
        }
        if (this.id === "filter-sugar" && this.checked) {
            d3.select("#filter-carbs").property("checked", false);
        }
    
        updateDropdown();  // Refresh dropdown based on selection
        updateDropdownButtonText(); 
        updateChart();  // 🎯 Refresh chart to remove default foods
    });
    
    


    
    d3.select("#update-chart").on("click", function () {
        updateChart();
    });
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
updateChart();
});

// 🎯 Function to wrap long text
function wrapText(selection, width) {
    selection.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word, line = [], lineNumber = 0, lineHeight = 1.2; // Line height multiplier
        const y = text.attr("y");
        const x = text.attr("x");
        const dy = 0;
        let tspan = text.text(null)
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + "em")
                    .text(word);
            }
        }
    });
}



