<?php
namespace App;

use App\Services\ValidatorService;

require_once __DIR__ . '/vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $jsonRaw = $input['json'] ?? '';

    if (!$jsonRaw) {
        echo json_encode(['status' => 'erro', 'mensagem' => 'JSON não fornecido']);
        exit;
    }

    $validator = new ValidatorService();
    $analysis = $validator->validate($jsonRaw);

    echo json_encode(['status' => 'sucesso', 'analysis' => $analysis]);
    exit;
}
