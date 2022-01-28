<?php

try {
  // helps to track and report errors
  ini_set('display_errors', 'On');
  error_reporting(E_ALL);

  // collects the form element values via POST
  $res = "";
  $data = "";

  if (isset(($_POST['data']))) {
    $data = json_decode($_POST['data'], true);
  }
  $id = $_POST['id']; // used to specify which APIs to call

  if ($id === 'geocodeLocation') {
    $res = fetch("https://api.opencagedata.com/geocode/v1/json?q=" . $data['latitude'] . "+" . $data['longitude'] . "&key=9a427b614bb5400eb3c625a0836a58ff");
  }

  if ($id === 'getSingleCountry') {
    $res = fetch("https://restcountries.com/v3.1/name/" . $data['name'] . "/?fullText=true&fields=name,currencies,flag,cca2,capital,population,capitalInfo");
  }

  if ($id === 'getCountryFromFile') {
    $res = getCountryNames();
  }

  if ($id === 'getWeather') {
    $weather = fetch(
      "http://api.weatherapi.com/v1/forecast.json?q=" . $data['city'] . "&days=3&key=91b205effd35461cbc2113747222701"
    );

    $res = isset($weather) && isset($weather['forecast']) ? $weather['forecast']['forecastday'] : $weather;
  }

  if ($id === 'getPopularCities') {
    $cities = fetch(
      "http://api.geonames.org/citiesJSON?north=" . $data['north'] . "&south=" . $data['south'] . "&east=" . $data['east'] . "&west=" . $data['west'] . "&maxRows=5&username=flightltd"
    );
    $res = isset($cities) && isset($cities['geonames']) ? $cities['geonames'] : [];
  }

  if ($id === 'getLatestNews') {
    $news = fetch(
      "https://api.newscatcherapi.com/v2/latest_headlines?countries=" . $data['countrycode'] . "&topic=travel&page_size=3",
      array('x-api-key: 6c80lJpLpFXEqvmPQl01NYoMKiENUnbr96EBasgNExo')
    );
    $res = isset($news) && isset($news['articles']) ? $news['articles'] : [];
  }

  if ($id === 'getCountryBorder') {
    $res = getCountryBorder($data['name']);
  }

  // structure the script's response as JSON with the requested data
  $response = getSuccessResponse($res);
} catch (Exception $e) {
  $response = getErrorResponse($e);
}

/* Returns a response to the client */
header('Content-Type: application/json; charset=UTF-8');
echo json_encode($response);


/* Methods for the API */
function fetch($url, $headers = null)
{
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_URL, $url);
  if (isset($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  }

  $result = curl_exec($ch);

  curl_close($ch);

  // converting the response from the external API to JSON format
  $decode = json_decode($result, true);
  return $decode;
};

function getSuccessResponse($data)
{
  $response['status']['code'] = "200";
  $response['status']['name'] = "success";
  $response['status']['description'] = "Successfully retrieved data";
  $response['data'] = $data;

  return $response;
}

function getErrorResponse($e)
{
  $response['status']['code'] = "500";
  $response['status']['name'] = "error";
  $response['status']['description'] = 'An error occured. Please try again or contact flakky.';
  $response['data'] = $e->getMessage();

  return $response;
}

function getCountryDataFromFile()
{
  $filename = '../../data/countryBorders.geo.json';

  $json = file_get_contents($filename);
  $json_data = json_decode($json, true);
  $countries = array_slice($json_data, 1);

  return  $countries['features'];
}

function getCountryNames()
{
  function formatWithNames($v)
  {
    return $v['properties']['name'];
  };

  $countryNames = array_map('formatWithNames', getCountryDataFromFile());
  sort($countryNames);
  return $countryNames;
}

function getCountryBorder($name)
{
  $border = array_filter(getCountryDataFromFile(), function ($v) use ($name) {
    return $v['properties']['name'] === $name;
  });
  return array_values($border)[0];
}
