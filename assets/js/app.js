const countriesWrapper = document.getElementById("countries-ul");
const countriesElement = document.querySelectorAll(".country");
const dropdownButton = document.getElementById("dropdownButton");
const loadingWrapper = document.getElementById("loadingWrapper");

const offcanvasFab = document.querySelector('#offcanvas-fab');
const infoContainer = document.querySelector('.offcanvas');
const offcanvas = new bootstrap.Offcanvas(infoContainer);

let EXCHANGE_RATE = {};

const popupHtml = "";

const map = L.map("map").setView([51.505, -0.09], 13);

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
const markers = L.markerClusterGroup();
/** This method will extract a list of countries from the countryBorders.geo.json file
 * The file must only return country names at this point
 */

const getColorFromString = (text) => {
  const hashCode = (str) => { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const intToRGB = (i) => {
    var c = (i & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
  };

  return intToRGB(hashCode(text));
};

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
    countrycode: country.cca2,
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
  markers.addLayer(marker);
  content.cities
    .map(c => (L.marker([c.lat, c.lng]).bindPopup(`
      <h6>${c.name}</h6>
      <a href="https://${c.wikipedia}" target="_blank" class="btn btn-outline-primary btn-sm">Learn more</a>
    `)))
    .forEach(m => {
      markers.addLayer(m);
    });
  map.addLayer(markers);

  map.setView([lat, lng], 6);
  showCountryContent(content);
};

const showCountryContent = (content) => {
  const titleContainer = document.querySelector('.offcanvas-bottom .offcanvas-title');
  const bodyContainer = document.querySelector('.offcanvas-bottom .offcanvas-body');

  titleContainer.innerHTML = `${content.flag} ${content.name}&nbsp;
  <span id="capitalCity" class="text-muted fs-6 ">${content?.capital}</span>`;

  bodyContainer.innerHTML = `
    <div class="row">
      <div class="col-md-3">
        <h5>Population</h5>
        <p>${content?.population.toLocaleString('en')}</p>
        <h5>Currency</h5>
        <p>${content?.currency}</p>
      </div>
      <div class="col-md-3">
        <h5>Weather Forecast</h5>
        <p>${content.currentWeather.weather[0].description}</p>
        <p><strong>Temperature</strong>: ${content.currentWeather.main.temp}°C</p>
        <p><strong>Humidity</strong>: ${content.currentWeather.main.humidity}%</p>
        <p><strong>Wind Speed</strong>: ${content.currentWeather.wind.speed}m/s</p>
      </div>
      <div class="col-md-3">
        <h5>Latest news</h5>
        <div class="media">
          ${content?.articles.map(article => `
          <img class="d-flex mr-3" src="${article.media}">
          <div class="media-body">
            <h6 class="mt-0">${article.title}</h6>
            <a href="${article.link}">Read more</a>
          </div>
          `).join('</div><div class="media">')}
        </div>
      </div>
      <div class="col-md-3">
        <h5>Popular Cities</h5>
        <p>
          ${content.cities
            .map(c => `<a href="https://${c.wikipedia}" target="_blank" class="btn btn-link">${c.name}</a>`)
            .join('')
          }
        </p>
      </div>
    </div>
    `;

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

const getLatestNews = async (countrycode) => {
  return new Promise(async (resolve, reject) => {
    const body = new FormData();
    body.append(
      "data",
      JSON.stringify({
        countrycode,
      })
    );
    body.append("id", "getLatestNews");
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

const getPopularCities = async (cardinals) => {
  return new Promise(async (resolve, reject) => {
    const body = new FormData();
    body.append(
      "data",
      JSON.stringify(cardinals)
    );
    body.append("id", "getPopularCities");
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

    const border = await getCountryBorder(countryName);

    const countryBorder = L.geoJSON(border, {
      style: function (feature) {
        return {
          color: feature.properties.color
        };
      }
    }).addTo(map);

    const countryBorderBounds = countryBorder.getBounds();
    map.fitBounds(countryBorderBounds);

    const north = countryBorderBounds.getNorth(),
      south = countryBorderBounds.getSouth(),
      east = countryBorderBounds.getEast(),
      west = countryBorderBounds.getWest();

    const cities = await getPopularCities({
      north,
      south,
      east,
      west
    });

    const articles = await getLatestNews(countriesInfo.countrycode);
    countriesInfo.cities = cities.filter(c => c.countrycode === countriesInfo.countrycode);
    countriesInfo.articles = articles;
    showOnMap(country.capitalInfo.latlng, countriesInfo);

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
  loadingWrapper.classList.add("loading");
  const countryName = await getCurrentLocation();
  await loadCountriesFromFile();
  await loadExchangeRates();
  updateButtonText(countryName);
  await getCountryInfo(countryName);


  infoContainer.addEventListener('hidden.bs.offcanvas', function () {
    offcanvasFab.style.display = 'block';
  });

  infoContainer.addEventListener('show.bs.offcanvas', function () {
    offcanvasFab.style.display = 'none';
  });

  offcanvasFab.addEventListener('click', (e) => {
    offcanvas.show();
  });
};

window.onload = init;