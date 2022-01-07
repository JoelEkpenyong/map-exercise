<?php

try {
  // helps to track and report errors
  ini_set('display_errors', 'On');
  error_reporting(E_ALL);

  // collects the form element values via POST
  $data = json_decode($_POST['data'], true);
  $id = $_POST['id']; // used to specify which APIs to call

  if ($id === 'geocodeLocation') {
    $res = fetch("https://api.opencagedata.com/geocode/v1/json?q=" . $data['latitude'] . "+" . $data['longitude'] . "&key=9a427b614bb5400eb3c625a0836a58ff");
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