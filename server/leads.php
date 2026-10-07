<?php
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require __DIR__.'/mail-lib.php';
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); http_response_code(405); echo json_encode(['ok'=>false,'message'=>'Используйте форму сайта.']); exit; }
    if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '',['https://artbalkon.site','https://www.artbalkon.site'],true)) { http_response_code(403); echo json_encode(['ok'=>false,'message'=>'Отправьте заявку с сайта artbalkon.site.']); exit; }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) throw new InvalidArgumentException('Некорректная заявка.');
    $body = file_get_contents('php://input',false,null,0,10241);
    if (strlen($body) > 10240) throw new InvalidArgumentException('Заявка слишком большая.');
    $options = json_decode(file_get_contents(__DIR__.'/lead-options.json'),true,512,JSON_THROW_ON_ERROR);
    $input = json_decode($body,true,32,JSON_THROW_ON_ERROR);
    $lead = normalize_mail_lead($input,$options);
    $result = deliver_mail_lead($lead,function($to,$subject,$body,$headers) { return function_exists('mail') && @mail($to,$subject,$body,$headers); },lead_storage(),$_SERVER['REMOTE_ADDR'] ?? 'unknown');
    echo json_encode($result,JSON_UNESCAPED_UNICODE);
} catch (InvalidArgumentException $e) {
    http_response_code(400); echo json_encode(['ok'=>false,'message'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(503); echo json_encode(['ok'=>false,'message'=>'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.'],JSON_UNESCAPED_UNICODE);
}
