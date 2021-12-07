const countriesWrapper = document.getElementById('countries-ul');
const countriesElement = document.querySelectorAll('.country');
const dropdownButton = document.getElementById('dropdownButton');
const loadingWrapper = document.getElementById('loadingWrapper');

let COUNTRY_DATA = [];
let EXCHANGE_RATE = {};
let SELECTEDCOUNTRY = {};

const getCountries = () => {
  loadingWrapper.classList.add('loading');
  fetch(
    'https://restcountries.com/v3.1/all/?fields=name,currencies,capital,population'
  )
    .then((res) => res.json())
    .then((data) => {
      COUNTRY_DATA = data;
      return data.map((country) => country.name.common);
    })
    .then((countryNames) => {
      appendToPage(countryNames);
      loadingWrapper.classList.remove('loading');
    })
    .catch((err) => {
      console.log('An error occured while getting countries: %s', err.message);
      loadingWrapper.classList.remove('loading');
    });
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

const getCurrentLocation = async () => {
  if (window.navigator.geolocation) {
    return new Promise((resolve, reject) => {
      window.navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${pos.coords.latitude}+${pos.coords.longitude}&key=9a427b614bb5400eb3c625a0836a58ff`
          );
          const data = await res.json();
          resolve(data.results[0].components.country);
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
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=70e19ba461fd1eb09a6eea1bbf30338f`
      );
      const data = res.json();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

const fetchExchangeRates = async (currency) => {
  const res = await fetch(
    'https://openexchangerates.org/api/latest.json?app_id=c61cb86d27c846648c2759cae6c10f72'
  );
  const data = await res.json();
  EXCHANGE_RATE = { base: data.base, rates: data.rates };
};

const getCountryExchangeRate = (country) => {
  let currency = Object.keys(country.currencies)[0];
  return EXCHANGE_RATE.rates[currency];
};

const handleClick = async (el) => {
  console.log('%s has been selected', el.target.textContent);
  loadingWrapper.classList.add('loading');
  const country = COUNTRY_DATA.find(
    (country) => country.name.common === el.target.textContent
  );
  try {
    const rate = await getCountryExchangeRate(country);
    const weatherData = await getCityWeather(country);
    const currencyCode = Object.keys(country.currencies)[0];

    const countriesInfo = {
      name: country.name.common,
      capital: country.capital[0],
      population: country.population,
      currency: `${country.currencies[currencyCode].name} (${currencyCode})`,
      exchangeRate: `1 ${currencyCode} = ${rate} ${EXCHANGE_RATE.base}`,
      currentWeather: weatherData,
    };

    SELECTEDCOUNTRY = countriesInfo;
    console.dir(SELECTEDCOUNTRY);
    loadingWrapper.classList.remove('loading');
  } catch (error) {
    loadingWrapper.classList.remove('loading');
  }
};

const init = async () => {
  getCountries();
  const countryName = await getCurrentLocation();
  updateButtonText(countryName);
  fetchExchangeRates();
};

window.onload = () => {
  init();
};
