

const colors = ['#79155B', '#F11A7B', '#0D1282', '#D71313', '#FF8400', '#4F200D'];
const getColor = (fuelType) => {
    switch (fuelType.toUpperCase()) {
        case "E85": return colors[0];
        case "CNG": return colors[1];
        case "LPG": return colors[2];
        case "ELEC": return colors[3];
        case "BD": return colors[4];
        case "LNG": return colors[5];
    }
}

let existingMap = null; // handling map container
function createMap(data, fuelTypes) {
    document.getElementById('fuelStation').innerHTML = '';
    if (existingMap) {
        existingMap.remove();
        existingMap = null;
    }
    const map = L.map('fuelStation').setView([41.9002646, -87.941968], 13);
    existingMap = map;

    // Add base layer (e.g., OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add markers for each station
    data.forEach(dt => {
        const lat = dt.Latitude;
        const lon = dt.Longitude;
        const city = dt.City;
        const station = dt['Station Name'];
        const fuelType = dt['Fuel Type Code'];
        const openedData = dt['Open Date'];

        const marker = L.circleMarker([lat, lon], {
            radius: 10, // Adjust the scaling factor
            fillColor: getColor(fuelType),
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);

        marker.bindPopup(`Location: ${lat}, ${lon} <br> City: ${city} <br> Station: ${station}<br>Open Date: ${openedData}`);
    });

    // Create a legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        console.log(fuelTypes);

        for (let i = 0; i < fuelTypes.length; i++) {
            const colorLabel = `<div style="display: inline-block; width: 20px; height: 20px; background-color: ${colors[i]}"></div>`;
            div.innerHTML +=
                `${colorLabel}&nbsp;&nbsp;<i>${fuelTypes[i]}</i><br />`; // Add a non-breaking space here
        }
        return div;
    };
    legend.addTo(map);
}

// Load the CSV data
const url = "http://127.0.0.1:5000/api/v1.0/dataset"
d3.json(url).then(function (data) {
    console.log("Loaded data:", data);

    var cityFuelDistribution = {};

    data.forEach(function (entry) {
        var city = entry["city"];
        var fuelType = entry["fuel_type_code"];

        if (!cityFuelDistribution[city]) {
            cityFuelDistribution[city] = {};
        }

        if (!cityFuelDistribution[city][fuelType]) {
            cityFuelDistribution[city][fuelType] = 1;
        } else {
            cityFuelDistribution[city][fuelType]++;
        }
    });

    // Convert city-fuel type hierarchy to treemap chart data
    var treemapChartData = {
        type: "treemap",
        labels: [],
        parents: [],
        values: []
    };

    function buildTreemapData(hierarchy) {
        Object.keys(hierarchy).forEach(function (city) {
            treemapChartData.labels.push(city);
            treemapChartData.parents.push("");
            treemapChartData.values.push(Object.keys(hierarchy[city]).length);

            Object.keys(hierarchy[city]).forEach(function (fuelType) {
                treemapChartData.labels.push(fuelType);
                treemapChartData.parents.push(city);
                treemapChartData.values.push(hierarchy[city][fuelType]);
            });
        });
    }

    buildTreemapData(cityFuelDistribution);

    // Create the treemap chart
    var treemapData = [treemapChartData];

    var treemapLayout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        treemapcolorway: "Viridis", // Use your defined colors array
        hoverlabel: { // Add hoverlabel configuration
            bgcolor: "#fff",
            bordercolor: "#000"
        }
    };

    // Render the treemap chart
    Plotly.newPlot("treemap-chart", treemapData, treemapLayout);
    console.log("Treemap chart rendered");

    // Convert city-fuel type distribution to pie chart data
    var pieChartData = buildPieChartData(cityFuelDistribution);

    function buildPieChartData(hierarchy) {
        var fuelTypeCounts = {};

        Object.keys(hierarchy).forEach(function (city) {
            Object.keys(hierarchy[city]).forEach(function (fuelType) {
                if (!fuelTypeCounts[fuelType]) {
                    fuelTypeCounts[fuelType] = hierarchy[city][fuelType];
                } else {
                    fuelTypeCounts[fuelType] += hierarchy[city][fuelType];
                }
            });
        });

        return Object.keys(fuelTypeCounts).map(function (fuelType) {
            return {
                label: fuelType,
                value: fuelTypeCounts[fuelType]
            };
        });
    }

    // Create a pie chart for fuel type distribution
    var pieData = [{
        type: "pie",
        labels: pieChartData.map(function (item) { return item.label; }),
        values: pieChartData.map(function (item) { return item.value; }),
        hoverinfo: "label+value",
        textinfo: "percent",
    }];

    var pieLayout = {
        title: "Fuel Type Distribution",
        margin: { l: 0, r: 0, b: 0, t: 30 },
    };

    // Render the pie chart
    Plotly.newPlot("pie-chart", pieData, pieLayout);
    console.log("Pie chart rendered");


    // map handling
    let fuelTypes = []
    data.forEach(element => {
        fuelTypes.push(element['Fuel Type Code']);
    });
    fuelTypes = new Set(fuelTypes);
    fuelTypes = [...fuelTypes];
    const fuelTypeContainer = document.getElementById('fuelType')

    let html = '<option value=All>ALL</option>'
    fuelTypes.forEach(el => html += `<option value=${el}>${el}</option>`)
    fuelTypeContainer.innerHTML = html;

    fuelTypeContainer.addEventListener('change', function () {
        var selectedFuelType = this.value.toUpperCase();
        if (selectedFuelType === "ALL") {
            createMap(data, fuelTypes);
        }
        else {
            const filteredData = data.filter(el => el['Fuel Type Code'].toUpperCase() === selectedFuelType)
            createMap(filteredData, fuelTypes);
        }
    })
    var changeEvent = new Event('change');
    fuelTypeContainer.value = "All";
    fuelTypeContainer.dispatchEvent(changeEvent);

});