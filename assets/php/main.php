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
    $res = fetch("https://restcountries.com/v3.1/name/" . urlencode($data['name']) . "/?fullText=true&fields=name,currencies,flag,capital,population,capitalInfo");
  }

  if ($id === 'getCountryFromFile') {
    $res = getCountryNames();
  }

  if ($id === 'getWeather') {
    $res = fetch(
      "https://api.openweathermap.org/data/2.5/weather?q=" . $data['city'] . "&units=metric&appid=70e19ba461fd1eb09a6eea1bbf30338f"
    );
  }

  if ($id === 'getExchangeRates') {
    $res = fetch(
      "https://openexchangerates.org/api/latest.json?app_id=c61cb86d27c846648c2759cae6c10f72"
    );
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
function fetch($url)
{
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_URL, $url);

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
