<?php
namespace App\Services;

class ValidatorService {
    public function validate(string $jsonRaw): array {
        $results = [
            'isValidJson' => false,
            'issues' => [],
            'type' => 'Unknown'
        ];

        // 1. Limpeza básica (remove tags script se coladas junto)
        $jsonRaw = preg_replace('/<script[^>]*>|<\/script>/i', '', $jsonRaw);
        $data = json_decode(trim($jsonRaw), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $results['issues'][] = [
                'severity' => 'grave',
                'message' => 'JSON inválido: ' . json_last_error_msg(),
                'fix' => 'Verifique se faltam aspas, vírgulas ou se o fechamento de chaves {} está correto.'
            ];
            return $results;
        }

        $results['isValidJson'] = true;
        $type = $data['@type'] ?? 'Unknown';
        $results['type'] = $type;

        // 2. Validações de Contexto
        if (!isset($data['@context']) || !str_contains($data['@context'], 'schema.org')) {
            $results['issues'][] = [
                'severity' => 'grave',
                'message' => 'Atributo @context ausente ou incorreto.',
                'fix' => 'Adicione "@context": "https://schema.org" no início do arquivo.'
            ];
        }

        // 3. Regras específicas por Tipo
        switch ($type) {
            case 'Article':
            case 'NewsArticle':
                $this->checkFields($data, ['headline', 'author', 'image'], $results);
                break;
            case 'Product':
                $this->checkFields($data, ['name', 'offers', 'description'], $results);
                break;
            case 'Organization':
                $this->checkFields($data, ['name', 'url'], $results);
                break;
        }

        return $results;
    }

    private function checkFields(array $data, array $required, array &$results) {
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $results['issues'][] = [
                    'severity' => ($field === 'name' || $field === 'headline') ? 'grave' : 'sugestao',
                    'message' => "O campo '$field' está ausente.",
                    'fix' => "Para melhor SEO, adicione a propriedade '$field' com valores reais do conteúdo."
                ];
            }
        }
    }
}
