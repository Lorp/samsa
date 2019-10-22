<?php

// custom-font.php?filename=XXX.ttf

$authUser = $_SERVER['REMOTE_USER'];

if ($_SERVER['SERVER_NAME'] == "localhost")
{
	$EXTERNAL_ROOT = "localhost/axispraxis";
	$INTERNAL_ROOT = "/Users/lorp/Sites/axispraxis";
}
else
{
	$EXTERNAL_ROOT = "http://www.axis-praxis.org";
	$INTERNAL_ROOT = "/home/lorp/axis-praxis.org";
}

date_default_timezone_set ("UTC");

$fontDir = "{$INTERNAL_ROOT}/fonts/custom/{$authUser}";

# must not contain slash
if (strpos ($_GET["filename"], "/") !== false)
	exit;

# safe now to send any file in the font dir
if (is_dir ($fontDir))
{
	chdir ($fontDir);
	header('Content-type: application/octet-stream');
	readfile ($_GET["filename"]);	
}

?>