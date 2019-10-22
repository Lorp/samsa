<?php

$json = array();

$authUser = $_SERVER['REMOTE_USER'];

if ($_SERVER['SERVER_NAME'] == "localhost")
{
	//$PATH_TO_SAMSA_SERVER = "/Users/lorp/Sites/node/samsa-server.js";
	$PATH_TO_SAMSA_SERVER = "/Users/lorp/Sites/samsa/samsa-server.js";
	$PATH_TO_FONTS = "/Users/lorp/Sites/samsa/fonts";
	$PATH_TO_NODE = "/usr/local/bin/node";
}
else
{
	$PATH_TO_SAMSA_SERVER = "/home/lorp/node/samsa-server.js";
	$PATH_TO_FONTS = "/home/lorp/axis-praxis.org/fonts/custom/{$authUser}";
	$PATH_TO_NODE = "/home/lorp/.nvm/versions/node/v8.9.1/bin/node";
}


$zipfile = "output.zip";

//echo $_GET['variations'];
//print_r ($_GET);

// http://localhost/axispraxis/samsa/samsa-server-wrapper.php?input-font=JingXiHei-VF_65535.ttf&variations[wght]=800&variations[wdth]=83&output-font=ar-huge&zip=1&format=json
// http://localhost/axispraxis/samsa/samsa-server-wrapper.php?input-font=Gingham.ttf&variations[wght]=650&variations[wdth]=130&output-font=gingham&zip=1&format=json
// http://www.axis-praxis.org/samsa/samsa-server-wrapper.php?input-font=Gingham.ttf&variations[wght]=471.32&variations[wdth]=103.9739&zip=1


$json["font-variation-settings"] = "";
$variations = [];
foreach ($_GET['variations'] as $tag => $value)
{
	if (	ord ($tag[0]) >= 33 && ord ($tag[0]) <= 126
		&&	ord ($tag[1]) >= 32 && ord ($tag[1]) <= 126
		&&	ord ($tag[2]) >= 32 && ord ($tag[2]) <= 126
		&&	ord ($tag[3]) >= 32 && ord ($tag[3]) <= 126 )
	{
		$value = (float)$value;
		$variations[] = "'{$tag}' $value";
	}
}


$json["font-variation-settings"] = implode (' ', $variations);
$varString = trim (preg_replace ('([ \',]+)', '-', $json["font-variation-settings"]), '-');
$json["input-font"] = $PATH_TO_FONTS . "/" . $_GET["input-font"];
$json["output-font"] = "ap-" . date("Ymd-His") . "-" . $varString . ".ttf";
$json["zipfile"] = $zipfile;
$json["commands"] = [];

ob_start();

$command = "{$PATH_TO_NODE} {$PATH_TO_SAMSA_SERVER} --input-font '{$json["input-font"]}' --variation-settings {$json["font-variation-settings"]} --output-font {$json["output-font"]}";
$json["commands"][] = $command;
exec ($command);

if ($_GET["zip"])
{
	$fileToServe = "{$json["output-font"]}.zip";
	$command = "zip {$fileToServe} {$json["output-font"]}";
	$json["commands"][] = $command;
	exec ($command);
}
else
	$fileToServe = $json["output-font"];

$json["length"] = filesize($fileToServe);
ob_end_flush();

//echo "/usr/local/bin/node {$PATH_TO_SAMSA_SERVER} --input-font '{$json["input-font"]}' --variation-settings {$json["font-variation-settings"]} --output-font {$json["output-font"]}";

if ($_GET['format'] == "json")
	print_r ($json);
else
{
	if ($_GET["zip"])
		header("Content-Type: application/zip");
	else
		header("Content-Type: application/x-font-ttf");

	header('Content-Length: ' . filesize($fileToServe));
	header('Content-Disposition: attachment; filename="' . $fileToServe . '"');
	readfile ($fileToServe);
}

