<?php

# store-font.php

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


$key = false;
switch ($authUser)
{
	case "arphic":
		$key = "aPoU9WJOzRpVumN527O3";
		break;

	case "dberlow":
		$key = "ZnNkZiBqc2RsamZoIHNp";
		break;

	case "iv":
		$key = "8f847cn849c8n49878c7";
		break;

	case "lorp":
		$key = "d87f9sifj03mfojjf003";
		break;

	case "nondescriptes":
		$key = "fu4mc89498dm4348sss2";
		break;

	case "dcrossland":
		$key = "87dijm7ddj7ynf63jhjh";
		break;
}

//echo "Key = $key, remote_user = {$_SERVER['REMOTE_USER']}";
if (!$key)
{
	exit;
}

date_default_timezone_set ("UTC");
//file_put_contents("test.txt", "test");

//echo "Hello from PHP. Key="+$key;
//$post = serialize($_POST);
//$files = serialize($_FILES);

//file_put_contents ()

//file_put_contents("test". date("Ymd-His").".bin", "test\n".$post."\n".$files);
//file_put_contents("this.txt", "Post elements =\nLength of data: ".gettype ($_POST["data"]));


/*
$binary = "";
for ($d=0;$d<strlen($_POST["data"]); $d++)
	$binary .= chr ($_POST["data"][d])
*/

//file_put_contents($_POST["filename"], $binary);
$fontDir = "/fonts/instances/{$authUser}";
chdir ($INTERNAL_ROOT . $fontDir);
$newFilename = str_replace(".ttf", "-".$key.".ttf", $_POST["filename"]);
file_put_contents($newFilename, base64_decode($_POST["data"]));

//echo "Here";

$returnObj = ["key" => $key, "path" => $EXTERNAL_ROOT . $fontDir . "/" . $newFilename];
echo json_encode($returnObj);

?>