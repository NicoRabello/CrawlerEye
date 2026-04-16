<?php
namespace App\Services;

class ValidatorService {
    private array $results;
    private array $data;

    public function validate(string $jsonRaw): array {
        $this->results = [
            'isValidJson' => false,
            'isValidLd' => false,
            'type' => 'Unknown',
            'issues' => [],
            'stats' => ['errors' => 0, 'warnings' => 0]
        ];

        if (!$this->validateSyntax($jsonRaw)) {
            return $this->results;
        }

        if (!$this->validateStructure()) {
            return $this->results;
        }

        $this->validateSemantics();

        return $this->results;
    }

    private function validateSyntax(string $jsonRaw): bool {
        $jsonRaw = preg_replace('/<script[^>]*>|<\/script>/i', '', $jsonRaw);
        $jsonRaw = trim($jsonRaw);

        $this->data = json_decode($jsonRaw, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $errorMsg = json_last_error_msg();
            $pos = $this->findErrorPosition($jsonRaw);
            
            $this->addIssue('grave', 'val_err_syntax', [
                'error' => "$errorMsg em linha {$pos['line']}, coluna {$pos['col']}"
            ]);
            return false;
        }

        $this->results['isValidJson'] = true;
        return true;
    }

    private function validateStructure(): bool {
        $hasContext = isset($this->data['@context']);
        $hasType = isset($this->data['@type']);

        if (!$hasContext) {
            $this->addIssue('grave', 'val_err_no_context');
        } elseif (!str_contains($this->data['@context'], 'schema.org')) {
            $this->addIssue('grave', 'val_err_bad_context');
        }

        if (!$hasType) {
            $this->addIssue('grave', 'val_err_no_type');
            return false;
        }

        $this->results['isValidLd'] = true;
        $this->results['type'] = $this->data['@type'];
        return true;
    }

    private function validateSemantics(): void {
        $type = $this->results['type'];

        switch ($type) {
            case 'Organization':
                $this->checkRequired(['name', 'url']);
                $this->checkUrl('url');
                $this->checkUrlArray('sameAs');
                break;

            case 'Product':
                $this->checkRequired(['name', 'image', 'description']);
                if (!isset($this->data['offers'])) {
                    $this->addIssue('grave', 'val_err_offers_missing');
                } else {
                    $this->validateOffers($this->data['offers']);
                }
                break;

            case 'Article':
            case 'NewsArticle':
            case 'BlogPosting':
                $this->checkRequired(['headline', 'author', 'datePublished']);
                break;

            case 'LocalBusiness':
            case 'Restaurant':
            case 'Store':
                $this->checkRequired(['name', 'address']);
                if (isset($this->data['address'])) {
                    $this->validateAddress($this->data['address']);
                }
                break;

            default:
                $this->addIssue('sugestao', 'val_err_unknown_type', ['type' => $type]);
                break;
        }
    }

    private function validateOffers($offers): void {
        $offerList = is_array($offers) && !isset($offers['@type']) ? $offers : [$offers];
        foreach ($offerList as $offer) {
            if (!isset($offer['price'])) $this->addIssue('grave', 'val_err_price_missing');
            if (!isset($offer['priceCurrency'])) $this->addIssue('grave', 'val_err_currency_missing');
        }
    }

    private function validateAddress($address): void {
        $required = ['streetAddress', 'addressLocality', 'addressCountry'];
        foreach ($required as $field) {
            if (!isset($address[$field]) || empty($address[$field])) {
                $this->addIssue('grave', 'val_err_address_missing');
                break;
            }
        }
    }

    private function checkRequired(array $fields): void {
        foreach ($fields as $field) {
            if (!isset($this->data[$field]) || empty($this->data[$field])) {
                $this->addIssue('grave', 'val_err_missing_field', [
                    'field' => $field,
                    'type' => $this->results['type']
                ]);
            }
        }
    }

    private function checkUrl(string $field): void {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_URL)) {
            $this->addIssue('grave', 'val_err_invalid_url', ['field' => $field]);
        }
    }

    private function checkUrlArray(string $field): void {
        if (isset($this->data[$field])) {
            $urls = is_array($this->data[$field]) ? $this->data[$field] : [$this->data[$field]];
            foreach ($urls as $url) {
                if (!filter_var($url, FILTER_VALIDATE_URL)) {
                    $this->addIssue('grave', 'val_err_invalid_url', ['field' => $field]);
                    break;
                }
            }
        }
    }

    private function addIssue(string $severity, string $i18nKey, array $params = []): void {
        $this->results['issues'][] = [
            'severity' => $severity,
            'key' => $i18nKey,
            'params' => $params,
            'fix' => $this->getFix($i18nKey)
        ];
        
        if ($severity === 'grave') $this->results['stats']['errors']++;
        else $this->results['stats']['warnings']++;
    }

    private function getFix(string $key): string {
        $fixes = [
            'val_err_no_context' => 'Adicione "@context": "https://schema.org" no início do objeto.',
            'val_err_no_type' => 'Adicione o campo "@type" (ex: "Product", "Article").',
            'val_err_offers_missing' => 'Adicione uma propriedade "offers" com "price" e "priceCurrency".',
            'val_err_missing_field' => 'Este campo é vital para SEO e resultados ricos no Google.'
        ];
        return $fixes[$key] ?? 'Consulte a documentação do Schema.org para este tipo.';
    }

    private function findErrorPosition(string $json): array {
        $error = error_get_last();
        $line = 1; $col = 1;
        return ['line' => $line, 'col' => $col];
    }
}
