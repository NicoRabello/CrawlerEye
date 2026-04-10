<?php

class CrawlerService {
    private $userAgent = "CrawlerEye/2.0";
    private $timeout = 3;

    public function fetchContent(string $url): ?string {
        $options = [
            "http" => [
                "method" => "GET",
                "header" => "User-Agent: {$this->userAgent}\r\n",
                "timeout" => $this->timeout
            ]
        ];
        return @file_get_contents($url, false, stream_context_create($options));
    }

    public function extractLinks(string $url, string $content): array {
        $links = [];
        if (str_contains($url, '.xml') || str_contains($content, '<?xml')) {
            $xml = @simplexml_load_string($content);
            if ($xml) {
                foreach ($xml->url as $node) $links[] = (string)$node->loc;
            }
        } else {
            preg_match_all('/<a\s+.*?href=["\']([^"\']+)["\'].*?>/i', $content, $matches);
            foreach ($matches[1] as $link) {
                if (str_starts_with($link, '/')) {
                    $p = parse_url($url);
                    $link = "{$p['scheme']}://{$p['host']}{$link}";
                }
                $links[] = $link;
            }
        }
        return array_unique($links);
    }

    public function extractJsonLd(string $content): array {
        $data = [];
        preg_match_all('/<script\s+type=["\']application\/ld\+json["\']>(.*?)<\/script>/is', $content, $matches);
        foreach ($matches[1] as $match) {
            $decoded = json_decode(trim($match), true);
            if ($decoded) $data[] = $decoded;
        }
        return $data;
    }
}
