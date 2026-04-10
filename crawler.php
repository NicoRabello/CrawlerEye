<?php
namespace App;

use App\Services\HttpService;
use App\Services\ParserService;

require_once __DIR__ . '/vendor/autoload.php';

set_time_limit(0);
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');

function sendEvent(array $data) {
    echo "data: " . json_encode($data) . "\n\n";
    ob_flush(); flush();
}

class CrawlerController {
    private $http;
    private $parser;

    public function __construct() {
        $this->http = new HttpService();
        $this->parser = new ParserService();
    }

    public function handle(string $url) {
        if (!preg_match("~^(?:f|ht)tps?://~i", $url)) $url = "http://" . $url;

        $baseHtml = $this->http->fetch($url);
        if (!$baseHtml) {
            sendEvent(['status' => 'erro', 'mensagem' => 'Não foi possível acessar a URL: ' . $url]);
            return;
        }

        $isSitemap = (str_contains($url, '.xml') || str_contains($baseHtml, '<?xml'));
        $links = $this->parser->extractLinks($url, $baseHtml);
        
        if (!$isSitemap && !in_array($url, $links)) {
            array_unshift($links, $url);
        }

        $links = array_unique(array_slice($links, 0, 50));
        sendEvent(['status' => 'iniciando', 'total' => count($links)]);

        foreach ($links as $link) {
            $pageHtml = ($link === $url && !$isSitemap) ? $baseHtml : $this->http->fetch($link);
            
            sendEvent([
                'status' => 'update',
                'link' => [
                    'url' => $link,
                    'status' => $pageHtml ? '200' : 'Erro',
                    'ok' => (bool)$pageHtml,
                    'ldjson' => $pageHtml ? $this->parser->extractJsonLd($pageHtml) : []
                ]
            ]);
        }

        sendEvent(['status' => 'concluido']);
    }
}

// Execução segura
try {
    $url = $_GET['url'] ?? '';
    if ($url) {
        (new CrawlerController())->handle($url);
    } else {
        sendEvent(['status' => 'erro', 'mensagem' => 'URL não informada.']);
    }
} catch (\Exception $e) {
    sendEvent(['status' => 'erro', 'mensagem' => 'Erro interno: ' . $e->getMessage()]);
}
