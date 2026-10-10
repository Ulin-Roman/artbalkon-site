<?php
// No recipient or mail headers are accepted from the browser.
const LEAD_RECIPIENT = 'balkonart@yandex.ru';
function lead_text($value, $max) {
    if (!is_string($value) || !preg_match('//u', $value) || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value)) throw new InvalidArgumentException('Некорректное поле заявки.');
    if (preg_match_all('/./us', $value) > $max) throw new InvalidArgumentException('Слишком длинное поле заявки.');
    return trim($value);
}
function normalize_mail_lead($input, $options) {
    if (!is_array($input) || !empty($input['website']) || ($input['consent'] ?? null) !== true) throw new InvalidArgumentException('Проверьте поля и согласие на обработку данных.');
    $form = $input['form'] ?? '';
    if (!in_array($form, ['quiz','contact','callback','transformation'], true)) throw new InvalidArgumentException('Неизвестная форма.');
    $name = lead_text($input['name'] ?? null, 70);
    if ($name === '') throw new InvalidArgumentException('Укажите имя.');
    $phone = preg_replace('/\D/', '', lead_text($input['phone'] ?? null, 30));
    if (strlen($phone) === 10) $phone = '7'.$phone;
    if (!preg_match('/^[78][0-9]{10}$/', $phone) || preg_match('/^([0-9])\1{9}$/', substr($phone,1))) throw new InvalidArgumentException('Проверьте номер телефона.');
    $id = $input['requestId'] ?? '';
    if (!is_string($id) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) throw new InvalidArgumentException('Обновите страницу и попробуйте ещё раз.');
    $lead = ['requestId'=>strtolower($id),'form'=>$form,'name'=>$name,'phone'=>'+7'.substr($phone,1),'consent'=>true,'consentVersion'=>'2026-09-16','page'=>lead_text($input['page'] ?? '/',500)];
    if (isset($input['calculation'])) {
        if ($form !== 'callback') throw new InvalidArgumentException('Некорректные параметры расчёта.');
        $lead['calculation'] = lead_text($input['calculation'],2000);
        if ($lead['calculation'] === '') throw new InvalidArgumentException('Укажите параметры расчёта.');
    }
    if ($form === 'transformation') {
        $lead['project'] = lead_text($input['project'] ?? null,300);
        if ($lead['project'] === '') throw new InvalidArgumentException('Выберите работу для заявки.');
    }
    if ($form === 'quiz') {
        foreach (['service','object','timing'] as $key) {
            if (!in_array($input[$key] ?? null,$options[$key],true)) throw new InvalidArgumentException('Ответьте на все вопросы расчёта.');
            $lead[$key] = $input[$key];
        }
        if (isset($input['gift'])) {
            if (!in_array($input['gift'],$options['gift'],true)) throw new InvalidArgumentException('Выберите подарок.');
            $lead['gift'] = $input['gift'];
        }
        foreach (['size'=>100,'detail'=>150] as $key=>$max) if (isset($input[$key])) {
            $lead[$key] = lead_text($input[$key],$max);
            if ($lead[$key] === '') throw new InvalidArgumentException('Уточните выбранный вариант.');
        }
    }
    $lead['attribution'] = [];
    $attribution = $input['attribution'] ?? [];
    if (!is_array($attribution)) throw new InvalidArgumentException('Некорректный источник заявки.');
    foreach (['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid','landing','referrer'] as $key) if (isset($attribution[$key])) $lead['attribution'][$key] = lead_text($attribution[$key],300);
    return $lead;
}
function lead_storage() {
    $dir = sys_get_temp_dir().'/artbalkon-mail-'.substr(hash('sha256',__DIR__),0,20);
    if (!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir)) throw new RuntimeException('Storage unavailable');
    return $dir;
}
function deliver_mail_lead($lead, $sender, $directory, $ip) {
    // A single bounded journal provides atomic rate limiting and duplicate protection.
    $file = fopen($directory.'/journal.json','c+');
    if ($file) chmod($directory.'/journal.json',0600);
    if (!$file || !flock($file,LOCK_EX)) throw new RuntimeException('Storage unavailable');
    try {
        $raw = stream_get_contents($file);
        $journal = $raw === '' ? [] : json_decode($raw,true,512,JSON_THROW_ON_ERROR);
        $now = time();
        foreach ($journal as $key=>$record) if ($record['time'] < $now-86400) unset($journal[$key]);
        $key = 'id:'.$lead['requestId'];
        $fingerprint = hash('sha256',json_encode($lead,JSON_UNESCAPED_UNICODE));
        if (isset($journal[$key]) && $journal[$key]['sent']) {
            if ($journal[$key]['fingerprint'] !== $fingerprint) throw new InvalidArgumentException('Эта заявка уже отправлена. Обновите страницу для новой заявки.');
            return ['ok'=>true,'id'=>$lead['requestId'],'mode'=>'live'];
        }
        $ipHash = hash('sha256',$ip);
        $count = 0;
        foreach ($journal as $record) if (!$record['sent'] && $record['ip'] === $ipHash && $record['time'] >= $now-600) $count++;
        if ($count >= 10 || count($journal) >= 10000) throw new RuntimeException('Rate limit');
        // Record every attempt before sending. Do not store name, phone or answers on disk.
        $journal['attempt:'.bin2hex(random_bytes(8))] = ['time'=>$now,'ip'=>$ipHash,'sent'=>false];
        $write = function() use ($file,&$journal) {
            $data = json_encode($journal,JSON_THROW_ON_ERROR);
            rewind($file);
            if (!ftruncate($file,0) || fwrite($file,$data) !== strlen($data) || !fflush($file)) throw new RuntimeException('Storage unavailable');
        };
        $write();
        $labels = ['form'=>'Форма','name'=>'Имя','phone'=>'Телефон','service'=>'Услуга','object'=>'Объект','timing'=>'Срок','gift'=>'Подарок','project'=>'Работа / подарок','size'=>'Размер','detail'=>'Уточнение','calculation'=>'Калькулятор — размеры и материалы','page'=>'Страница','requestId'=>'Номер заявки','consentVersion'=>'Версия согласия'];
        $lines = ['Заявка с artbalkon.site', 'Дата: '.gmdate('c'),'Согласие на обработку данных: получено'];
        foreach ($labels as $field=>$label) if (isset($lead[$field])) $lines[] = $label.': '.$lead[$field];
        foreach ($lead['attribution'] as $field=>$value) $lines[] = $field.': '.$value;
        $subject = '=?UTF-8?B?'.base64_encode('Новая заявка ArtBalkon').'?=';
        $headers = ['From'=>'ArtBalkon <forms@artbalkon.site>','MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8','Content-Transfer-Encoding'=>'base64'];
        $body = chunk_split(base64_encode(implode("\r\n",$lines)),76,"\r\n");
        if (!$sender(LEAD_RECIPIENT,$subject,$body,$headers)) throw new RuntimeException('Mail unavailable');
        $journal[$key] = ['time'=>$now,'ip'=>$ipHash,'sent'=>true,'fingerprint'=>$fingerprint];
        $write();
        return ['ok'=>true,'id'=>$lead['requestId'],'mode'=>'live'];
    } finally { flock($file,LOCK_UN); fclose($file); }
}
