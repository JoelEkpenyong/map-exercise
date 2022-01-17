const countriesWrapper = document.getElementById("countries-ul");
const countriesElement = document.querySelectorAll(".country");
const dropdownButton = document.getElementById("dropdownButton");
const loadingWrapper = document.getElementById("loadingWrapper");

let EXCHANGE_RATE = {};

const popupHtml = "";

const map = L.map("map");

L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
    accessToken: "pk.eyJ1Ijoiam9lbGVrcGVueW9uZyIsImEiOiJja3d4Znd3bXMwZGF0MnFycm81eXI0b2MwIn0.EauZWfHlAP7Qa-3bDc4N5Q",
  }
).addTo(map);

const marker = L.marker([1.0, 38.0]).addTo(map);

/** This method will extract a list of countries from the countryBorders.geo.json file
 * The file must only return country names at this point
 */

const loadCountriesFromFile = () => {
  loadingWrapper.classList.add("loading");
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("id", "getCountryFromFile");
    fetch("./assets/php/main.php", {
        method: "post",
        body,
      })
      .then((res) => res.json())
      .then(({
        data: countryNames
      }) => {
        appendToPage(countryNames);
        loadingWrapper.classList.remove("loading");
        resolve("Success");
      })
      .catch((err) => {
        console.log(
          "An error occured while getting countries: %s",
          err.message
        );
        loadingWrapper.classList.remove("loading");
        reject(err);
      });
  });
};

const getCountryBorder = async (name) => {
  const body = new FormData();
  body.append("id", "getCountryBorder");
  body.append("data", JSON.stringify({
    name,
  }));

  const res = await fetch("./assets/php/main.php", {
    method: "post",
    body,
  });

  const {
    data
  } = await res.json();
  return data;
};

const getSelectedCountry = (name) => {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append(
      "data",
      JSON.stringify({
        name,
      })
    );
    body.append("id", "getSingleCountry");
    fetch("./assets/php/main.php", {
        method: "post",
        body,
      })
      .then((res) => res.json())
      .then(({
        data
      }) => {
        resolve(data[0]);
      })
      .catch((err) => {
        console.log(
          "An error occured while getting data for selected country: %s",
          err.message
        );
        loadingWrapper.classList.remove("loading");
        reject(err);
      });
  });
};

const formatSelectedCountry = (country, rate, weatherData) => {
  const currencyCode = Object.keys(country.currencies)[0];

  return {
    name: country.name.common,
    capital: country.capital[0],
    population: country.population,
    flag: country.flag,
    currency: `${country.currencies[currencyCode].name} (${currencyCode})`,
    exchangeRate: `1 ${currencyCode} = ${rate} ${EXCHANGE_RATE.base}`,
    currentWeather: weatherData,
    latlng: country.capitalInfo.latlng,
  };
};

const appendToPage = (data) => {
  data.forEach((countryName) => {
    const listItem = document.createElement("li");
    const btnEl = document.createElement("button");
    btnEl.classList.add("btn", "btn-light", "w-100", "text-start", "country");
    listItem.classList.add("dropdown-item");
    btnEl.appendChild(document.createTextNode(countryName));
    listItem.appendChild(btnEl);
    countriesWrapper.appendChild(listItem);
    btnEl.addEventListener("click", (el) => {
      updateButtonText(el);
      handleClick(el);
    });
  });
};

const updateButtonText = (el) => {
  if (typeof el === "object") {
    dropdownButton.textContent = el.target.textContent;
    return;
  }
  dropdownButton.textContent = el;
};

const showOnMap = ([lat, lng], content) => {
  marker.setLatLng([lat, lng]);
  showCountryContent(content);
  map.setView([lat, lng], 6);
};

const showCountryContent = (content) => {
  const infoContainer = document.querySelector('.offcanvas');
  const titleContainer = document.querySelector('.offcanvas-title');
  const bodyContainer = document.querySelector('.offcanvas-body');

  titleContainer.innerHTML = `${content.flag} ${content.name}<br/>
  <span id="capitalCity" class="text-muted fs-6 ">${content?.capital}</span>`;

  bodyContainer.innerHTML = `
    <p class="fs-6">${content?.name} has a total population of ${content?.population}. It's currency is ${content?.currency} - ${content?.exchangeRate}</p>
    <p class="fs-6">
      <span class="fs-6">Current Weather:</span>
      <span class="fs-6 mb-3 text-capitalize">${content.currentWeather.weather[0].description}</span>
      with temperature of ${content.currentWeather.main.temp}°C, humidity of ${content.currentWeather.main.humidity}%, and wind speeds of ${content.currentWeather.wind.speed}m/s
    </p>
    `;

  const offcanvas = new bootstrap.Offcanvas(infoContainer);
  offcanvas.show();
};

const getCurrentLocation = async () => {
  if (window.navigator.geolocation) {
    return new Promise((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const body = new FormData();
            body.append(
              "data",
              JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              })
            );
            body.append("id", "geocodeLocation");
            const res = await fetch("./assets/php/main.php", {
              method: "post",
              body,
            });

            const {
              data
            } = await res.json();
            let countryName = data.results[0].components.country;
            resolve(countryName);
          },
          (err) => {
            reject(err);
          }
      );
    });
  }
};

const getCityWeather = async (country) => {
  let city = country.capital[0];

  return new Promise(async (resolve, reject) => {
    const body = new FormData();
    body.append(
      "data",
      JSON.stringify({
        city,
      })
    );
    body.append("id", "getWeather");
    try {
      const res = await fetch("./assets/php/main.php", {
        method: "post",
        body,
      });

      const data = await res.json();
      resolve(data.data);
    } catch (error) {
      reject(error);
    }
  });
};

const loadExchangeRates = async () => {
  return new Promise(async (resolve, reject) => {
    const body = new FormData();
    body.append("id", "getExchangeRates");

    const res = await fetch("./assets/php/main.php", {
      method: "post",
      body,
    });

    const {
      data
    } = await res.json();
    EXCHANGE_RATE = {
      base: data.base,
      rates: data.rates,
    };

    resolve(data);
    reject("Failed");
  });
};

const getCountryExchangeRate = (country) => {
  let currency = Object.keys(country.currencies)[0];
  return EXCHANGE_RATE.rates[currency];
};

const getCountryInfo = async (countryName) => {
  loadingWrapper.classList.add("loading");
  const country = await getSelectedCountry(countryName);
  try {
    const rate = await getCountryExchangeRate(country);
    const weatherData = await getCityWeather(country);
    const countriesInfo = formatSelectedCountry(country, rate, weatherData);

    showOnMap(country.capitalInfo.latlng, countriesInfo);
    const border = await getCountryBorder(countryName);
    console.log(border);

    const countryBorder = L.geoJSON(border, {
      style: function (feature) {
        return {
          color: feature.properties.color
        };
      }
    }).addTo(map);
    map.fitBounds(countryBorder.getBounds());
    loadingWrapper.classList.remove("loading");
  } catch (error) {
    loadingWrapper.classList.remove("loading");
  }
};

const handleClick = async (el) => {
  const countryName = el.target.textContent;
  await getCountryInfo(countryName);
};

const init = async () => {
  await loadCountriesFromFile();
  await loadExchangeRates();
  const countryName = await getCurrentLocation();
  updateButtonText(countryName);
  await getCountryInfo(countryName);
};

window.onload = init;