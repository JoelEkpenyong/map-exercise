const countriesWrapper = document.getElementById('countries-ul');
const countriesElement = document.querySelectorAll('.country');
const dropdownButton = document.getElementById('dropdownButton');
const loadingWrapper = document.getElementById('loadingWrapper');

let COUNTRY_DATA = [];
let EXCHANGE_RATE = {};
let SELECTEDCOUNTRY = {};

const popupHtml = '';

const map = L.map('map');

L.tileLayer(
  'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1Ijoiam9lbGVrcGVueW9uZyIsImEiOiJja3d4Znd3bXMwZGF0MnFycm81eXI0b2MwIn0.EauZWfHlAP7Qa-3bDc4N5Q',
  }
).addTo(map);

const marker = L.marker([1.0, 38.0]).addTo(map);


/** This method will extract a list of countries from the countryBorders.geo.json file
 * The file must only return country names at this point
 */
const getCountries = () => {
  loadingWrapper.classList.add('loading');
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('id', 'getCountries');
    fetch('./assets/php/main.php', {
        method: 'post',
        body
      })
      .then((res) => res.json())
      .then(({
        data
      }) => {
        COUNTRY_DATA = data;
        return data.map((country) => country.name.common);
      })
      .then((countryNames) => {
        appendToPage(countryNames);
        loadingWrapper.classList.remove('loading');
        resolve('Success');
      })
      .catch((err) => {
        console.log(
          'An error occured while getting countries: %s',
          err.message
        );
        loadingWrapper.classList.remove('loading');
        reject(err);
      });
  });
};

const getSelectedCountry = (name) =>
  COUNTRY_DATA.find((country) => country.name.common === name);

const formatSelectedCountry = (country, rate, weatherData) => {
  const currencyCode = Object.keys(country.currencies)[0];

  return {
    name: country.name.common,
    capital: country.capital[0],
    population: country.population,
    currency: `${country.currencies[currencyCode].name} (${currencyCode})`,
    exchangeRate: `1 ${currencyCode} = ${rate} ${EXCHANGE_RATE.base}`,
    currentWeather: weatherData,
    latlng: country.capitalInfo['latlng'],
  };
};

const appendToPage = (data) => {
  data.forEach((countryName) => {
    const listItem = document.createElement('li');
    const btnEl = document.createElement('button');
    btnEl.classList.add('btn', 'btn-light', 'w-100', 'text-start', 'country');
    listItem.classList.add('dropdown-item');
    btnEl.appendChild(document.createTextNode(countryName));
    listItem.appendChild(btnEl);
    countriesWrapper.appendChild(listItem);
    btnEl.addEventListener('click', (el) => {
      updateButtonText(el);
      handleClick(el);
    });
  });
};

const updateButtonText = (el) => {
  if (typeof el === 'object') {
    dropdownButton.textContent = el.target.textContent;
    return;
  }
  dropdownButton.textContent = el;
};

const showOnMap = ([lat, lng], content) => {
  marker.setLatLng([lat, lng]);
  marker
    .bindPopup(
      `<div class="card" style="width: 18rem;">
      <div class="card-body">
        <h5 id="countryName" class="card-title fs-5">${content?.name}</h5>
        <h6 id="capitalCity" class="card-subtitle mb-2 text-muted fs-6 ">${content?.capital}</h6>
        <p class="card-text fs-6">${content?.name} has a total population of ${content?.population}. It's currency is ${content?.currency} - ${content?.exchangeRate}</p>
        <p class="card-text fs-6">
          <span class=" fs-5 card-title">Current Weather</span> <br>
          <span class="fs-6 mb-3 d-block text-capitalize">${content.currentWeather.weather[0].description}</span>
          Temperature of ${content.currentWeather.main.temp}°C, humidity of ${content.currentWeather.main.humidity}%, and wind speeds of ${content.currentWeather.wind.speed}m/s
        </p>

        <a href="#" class="card-link">Card link</a>
        <a href="#" class="card-link">Another link</a>
      </div>
  	</div>`
    )
    .openPopup();
  map.setView([lat, lng], 8);
};

const getCurrentLocation = async () => {
  if (window.navigator.geolocation) {
    return new Promise((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const body = new FormData();
            body.append('data', JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }));
            body.append('id', 'geocodeLocation');
            const res = await fetch('./assets/php/main.php', {
              method: 'post',
              body
            });

            const data = await res.json();
            console.log(JSON.stringify(data, null, 2));
            let countryName = data.results[0].components.country;
            const country = getSelectedCountry(countryName);
            const rate = await getCountryExchangeRate(country);
            const weatherData = await getCityWeather(country);
            const countryInfo = formatSelectedCountry(country, rate, weatherData);
            showOnMap([pos.coords.latitude, pos.coords.longitude], countryInfo);
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
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=70e19ba461fd1eb09a6eea1bbf30338f`
      );
      const data = res.json();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

const fetchExchangeRates = async (currency) => {
  return new Promise(async (resolve, reject) => {
    const res = await fetch(
      'https://openexchangerates.org/api/latest.json?app_id=c61cb86d27c846648c2759cae6c10f72'
    );
    const data = await res.json();
    EXCHANGE_RATE = {
      base: data.base,
      rates: data.rates
    };

    resolve(data);
    reject('Failed');
  });
};

const getCountryExchangeRate = (country) => {
  let currency = Object.keys(country.currencies)[0];
  return EXCHANGE_RATE.rates[currency];
};

const handleClick = async (el) => {
  console.log('%s has been selected', el.target.textContent);
  loadingWrapper.classList.add('loading');
  const country = getSelectedCountry(el.target.textContent);
  try {
    const rate = await getCountryExchangeRate(country);
    const weatherData = await getCityWeather(country);
    const countriesInfo = formatSelectedCountry(country, rate, weatherData);

    SELECTEDCOUNTRY = countriesInfo;
    showOnMap(country.capitalInfo['latlng'], countriesInfo);
    console.dir(SELECTEDCOUNTRY);
    loadingWrapper.classList.remove('loading');
  } catch (error) {
    loadingWrapper.classList.remove('loading');
  }
};

const init = async () => {
  await getCountries();
  await fetchExchangeRates();
  const countryName = await getCurrentLocation();
  updateButtonText(countryName);
};

window.onload = () => {
  init();
};