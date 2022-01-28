const countriesWrapper = document.getElementById("countries-ul");
const dropdownButton = document.getElementById("dropdownButton");
const loadingWrapper = document.getElementById("loadingWrapper");

const offcanvasFab = document.querySelector('#offcanvas-fab');
const infoContainer = document.querySelector('.offcanvas');
const offcanvas = new bootstrap.Offcanvas(infoContainer);

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
        name: encodeURIComponent(name),
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

const formatSelectedCountry = (country, weatherData) => {
  const currencyCode = Object.keys(country.currencies)[0];

  return {
    name: country.name.common,
    capital: country.capital[0],
    population: country.population,
    flag: country.flag,
    countrycode: country.cca2,
    currency: `${country.currencies[currencyCode].name} (${currencyCode})`,
    forecast: weatherData || [],
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
  <span id="capitalCity" class="text-muted fs-6 ">${content?.capital}</span>
  <ul class="ms-3 nav nav-pills" id="myTab" role="tablist">
      <li class="nav-item" role="presentation">
        <a class="nav-link active" id="general-tab" data-bs-toggle="tab" data-bs-target="#general" type="button" role="tab" aria-controls="home" aria-selected="true">
          General Information
        </a>
      </li>
      <li class="nav-item" role="presentation">
        <a class="nav-link" id="weather-tab" data-bs-toggle="tab" data-bs-target="#weather" type="button" role="tab" aria-controls="home" aria-selected="true">
          Weather Forecast
        </a>
      </li>
    </ul>`;

  bodyContainer.innerHTML = `
    <div class="tab-content" id="myTabContent2">
      <div class="tab-pane fade show active" id="general" role="tabpanel" aria-labelledby="general-tab">
        <div class="row">
          <div class="col-md-4">
            <h5>Population</h5>
            <p>${content?.population.toLocaleString('en')}</p>
            <h5>Currency</h5>
            <p>${content?.currency}</p>
          </div>
          <div class="col-md-4">
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
          <div class="col-md-4">
            <h5>Popular Cities</h5>
            <p>
              ${content.cities
                .map(c => `<a href="https://${c.wikipedia}" target="_blank" class="btn btn-link">${c.name}</a>`)
                .join('')
              }
            </p>
          </div>
        </div>
      </div>

      <div class="tab-pane fade show" id="weather" role="tabpanel" aria-labelledby="weather-tab">
        <div class="row">
          <ul class="nav nav-tabs mt-3" id="myTab" role="tablist">
          ${content?.forecast.map((f, i) => `
            <li class="nav-item" role="presentation">
              <a class="nav-link  ${i === 0 && 'active'}" id="${f.date}-tab" data-bs-toggle="tab" data-bs-target="#panel-${f.date}" type="button" role="tab" aria-controls="home" aria-selected="true">
                <div class="text-center">
                  <div>${f.date}</div>
                  <img height="64" src="${f.day.condition.icon}" title="${f.day.condition.text}" />
                  <p>
                    <strong>${f.day.maxtemp_c}°C</strong> /
                    <small>${f.day.mintemp_c}°C</small>
                  </p>
                </div>
              </a>
            </li>
          `).join('')}
          </ul>
          <div class="tab-content" id="myTabContent">
          ${content?.forecast.map((f, i) => `
          <div class="tab-pane fade show ${i === 0 && 'active'}" id="panel-${f.date}" role="tabpanel" aria-labelledby="${f.date}-tab">
            <div class="d-flex px-3 py-3">
              ${f.hour
                .filter(h => (new Date(h.time).getHours()) % 3 === 0)
                .map(h => `
                  <div class="text-center me-3">
                    <div>${h.time.split(' ')[1]}</div>
                    <img height="64" src="${h.condition.icon}" title="${h.condition.text}" />
                    <p><strong>${h.temp_c}°C</strong></p>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
          </div>
        </div>
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

const getCountryInfo = async (countryName) => {
  loadingWrapper.classList.add("loading");
  const country = await getSelectedCountry(countryName);
  try {
    const weatherData = await getCityWeather(country);
    const countriesInfo = formatSelectedCountry(country, weatherData);
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
  try {
    const countryName = await getCurrentLocation();
    await loadCountriesFromFile();
    updateButtonText(countryName);
    await getCountryInfo(countryName);
  } catch (error) {
    loadingWrapper.classList.remove("loading");
    console.log(error);
  }


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