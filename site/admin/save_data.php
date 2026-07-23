<?php
ob_start();
session_start();

/* Proteção de sessão idêntica ao painel admin */
if (!isset($_SESSION['arcanjos_admin']) || $_SESSION['arcanjos_admin'] !== true) {
    header('HTTP/1.1 403 Forbidden');
    echo json_encode(['error' => 'Acesso negado.']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$type = $_GET['type'] ?? '';
if (!in_array($type, ['obitos', 'testemunhos'])) {
    echo json_encode(['error' => 'Tipo inválido.']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null) {
    echo json_encode(['error' => 'Dados JSON inválidos.']);
    exit;
}

if ($type === 'obitos') {
    /* Processa imagens e PDFs enviados em base64 e guarda-os fisicamente */
    foreach ($data as $key => $obito) {
        // 1. Processar Imagem Base64
        if (!empty($obito['_imgBase64'])) {
            $base64 = $obito['_imgBase64'];
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $typeMatch)) {
                $ext = strtolower($typeMatch[1]);
                if (in_array($ext, ['jpeg', 'jpg', 'png', 'webp'])) {
                    $imgData = base64_decode(substr($base64, strpos($base64, ',') + 1));
                    if ($imgData !== false) {
                        $filename = $obito['id'] . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
                        $dest_path = '../obitos/imagens/' . $filename;
                        if (file_put_contents($dest_path, $imgData)) {
                            // Atualiza a URL no JSON final para apontar para o ficheiro físico
                            $data[$key]['foto'] = 'obitos/imagens/' . $filename;
                        }
                    }
                }
            }
        }
        
        // 2. Processar PDF Base64
        if (!empty($obito['_pdfBase64'])) {
            $base64 = $obito['_pdfBase64'];
            if (preg_match('/^data:application\/pdf;base64,/', $base64)) {
                $pdfData = base64_decode(substr($base64, strpos($base64, ',') + 1));
                if ($pdfData !== false) {
                    $filename = !empty($obito['_pdfFileName']) ? $obito['_pdfFileName'] : ($obito['id'] . '.pdf');
                    // Sanitiza o nome do ficheiro PDF
                    $filename = preg_replace('/[^a-zA-Z0-9\._-]/', '_', $filename);
                    $dest_path = '../obitos/pdfs/' . $filename;
                    if (file_put_contents($dest_path, $pdfData)) {
                        // Atualiza a URL no JSON final para apontar para o ficheiro físico
                        $data[$key]['pdf'] = 'obitos/pdfs/' . $filename;
                    }
                }
            }
        }

        // Limpa as chaves temporárias de base64 para o JSON final não ficar gigante
        unset($data[$key]['_imgBase64']);
        unset($data[$key]['_pdfBase64']);
        unset($data[$key]['_imgFileName']);
        unset($data[$key]['_imgFileSize']);
        unset($data[$key]['_pdfFileName']);
        unset($data[$key]['_pdfFileSize']);
    }

    $file_path = '../data/obituarios.json';
} else {
    $file_path = '../data/testemunhos.json';
}

/* Grava o arquivo JSON final */
if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['success' => true]);
} else {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['error' => 'Não foi possível gravar no servidor.']);
}
?>
