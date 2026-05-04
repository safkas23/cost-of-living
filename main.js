// names for each data column
const LABELS = {
  composite:      "Overall composite",
  grocery:        "Grocery",
  housing:        "Housing",
  utilities:      "Utilities",
  transportation: "Transportation",
  health:         "Healthcare",
  misc:           "Misc. goods & services"
};

// 6 spending categories
const CATS = ["grocery", "housing", "utilities",
              "transportation", "health", "misc"];

// maps index values 80-180 to 6 pink shades
// lower index = light pink, higher index = dark pink
const colorScale = d3.scaleQuantize()
  .domain([80, 180])
   .range([
    "#FBEAF0",
    "#F4C0D1",
    "#ED93B1",
    "#D4537E",
    "#993556",
    "#72243E"
  ]);

let currentCat = "composite"; // dropdown selected
let selectedState = null;     // state clicked
let barChart = null;          
let svgPaths;               
let DATA = {};               

d3.csv("cost_of_living_2025.csv", d => ({
  state:          d.State,
  composite:      +d.Composite,       
  grocery:        +d.Grocery,
  housing:        +d.Housing,
  utilities:      +d.Utilities,
  transportation: +d.Transportation,
  health:         +d.Health,
  misc:           +d.Misc
})).then(rows => {

  // build a lookup object
  rows.forEach(r => DATA[r.state] = r);

  buildLegend();
  loadMap();

});

const tooltip = d3.select("#tooltip");

function loadMap() {
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
    .then(us => {
      const features = topojson.feature(us, us.objects.states).features;

      // create the SVG canvas inside the #map div
      const svg = d3.select("#map")
        .append("svg")
        .attr("viewBox", "0 0 960 560"); // scales screen size

      // AlbersUSA projection — fits all 50 states including AK & HI
      const projection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([480, 280]);

      const path = d3.geoPath(projection);

      // draw one path element per state
      svgPaths = svg.selectAll("path")
        .data(features)
        .join("path")
          .attr("d", path)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.8)
          .attr("fill", d => getFill(d.properties.name))
          .style("cursor", "pointer")
          .on("mousemove", handleMouseMove)
          .on("mouseleave", handleMouseLeave)
          .on("click", handleClick);
    });
}

// returns the correct color for a state
function getFill(stateName) {
  const row = DATA[stateName];
  return row ? colorScale(row[currentCat]) : "#ddd";
}

// show tooltip near the mouse cursor
function handleMouseMove(event, d) {
  const name = d.properties.name;
  const row = DATA[name];
  if (!row) return;
  tooltip
    .style("opacity", 1)
    .style("left", (event.clientX + 12) + "px")
    .style("top",  (event.clientY - 36) + "px")
    .html(`<strong>${name}</strong><br>
           ${LABELS[currentCat]}: <strong>${row[currentCat]}</strong>`);
}

// hide tooltip when mouse leaves a state
function handleMouseLeave() {
  tooltip.style("opacity", 0);
}

// when dropdown changes, update currentCat and repaint all states
document.getElementById("category")
  .addEventListener("change", e => {
    currentCat = e.target.value;
    svgPaths.attr("fill", d => getFill(d.properties.name));
  });

// when a state is clicked, show the bar chart breakdown
function handleClick(event, d) {
  const name = d.properties.name;
  const row = DATA[name];
  if (!row) return;

  // show the detail panel
  document.getElementById("detail").style.display = "block";
  document.getElementById("state-name").textContent = name;
  document.getElementById("state-composite").textContent =
    `Composite index: ${row.composite} (U.S. avg = 100)`;

  // destroy old chart before drawing a new one
  if (barChart) barChart.destroy();

  const vals = CATS.map(c => row[c]);
  const catLabels = CATS.map(c => LABELS[c]);

  // pink = above avg, teal = below avg, gray = near avg
  const barColors = vals.map(v =>
    v > 110 ? "#D4537E" : v < 90 ? "#1D9E75" : "#888780"
  );  

  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: catLabels,
      datasets: [{ data: vals, backgroundColor: barColors,
                   borderRadius: 4, barThickness: 22 }]
    },
    options: {
      indexAxis: "y",          
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 60, max: 220 }, 
        y: { ticks: { font: { size: 12 } } }
      }
    }
  });
}

function buildLegend() {
  const colors = ["#FBEAF0", "#F4C0D1", "#ED93B1",
                   "#D4537E", "#993556", "#72243E"];
  const el = document.getElementById("legend");
  el.innerHTML = "<span>Lower cost</span>";
  colors.forEach(c => {
    el.innerHTML +=
      `<span style="display:inline-block; width:30px; height:12px;
        background:${c}; border-radius:2px; margin:0 2px;"></span>`;
  });
  el.innerHTML += "<span>Higher cost</span>";
}