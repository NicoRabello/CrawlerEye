<?php
namespace App\Services;

class ParserService {
    public function extractLinks(string $baseUrl, string $html): array {
        $links = [];
        $p = parse_url($baseUrl);
        $host = $p['host'] ?? '';

        if (str_contains($baseUrl, '.xml') || str_contains($html, '<?xml')) {
            $xml = @simplexml_load_string($html);
            if ($xml) {
                foreach ($xml->url as $node) {
                    $links[] = (string)$node->loc;
                }
            }
        } else {
            // Regex melhorada para pegar links de forma mais robusta
            preg_match_all('/<a[^>]+href=["\']([^"\']+)["\']/i', $html, $matches);
            foreach ($matches[1] as $link) {
                // Ajusta links relativos
                if (str_starts_with($link, '/')) {
                    $link = $p['scheme'] . "://" . $host . $link;
                }
                
                // Filtra para manter apenas links do mesmo domínio
                if (str_contains($link, $host)) {
                    $links[] = $link;
                }
            }
        }
        return array_unique(array_filter($links, fn($l) => filter_var($l, FILTER_VALIDATE_URL)));
    }

    public function extractJsonLd(string $html): array {
        $data = [];
        // Regex para capturar blocos JSON-LD, mesmo com atributos extras
        preg_match_all('/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $matches);
        foreach ($matches[1] as $match) {
            $decoded = json_decode(trim($match), true);
            if ($decoded) $data[] = $decoded;
        }
        return $data;
    }
}
