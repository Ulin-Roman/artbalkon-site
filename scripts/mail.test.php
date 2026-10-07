<?php
require __DIR__.'/../server/mail-lib.php';
function check($condition,$message) { if (!$condition) throw new RuntimeException($message); }
function fails($callback,$type) { try { $callback(); } catch (Throwable $e) { check($e instanceof $type,'Wrong exception: '.get_class($e)); return; } throw new RuntimeException('Expected rejection'); }
$options = ['service'=>['Остекление'],'object'=>['Балкон'],'timing'=>['Пока выбираю'],'gift'=>['Тёплый пол']];
$base = ['requestId'=>'12345678-1234-1234-1234-123456789abc','form'=>'callback','name'=>'Тест','phone'=>'+7 (999) 123-45-67','consent'=>true,'page'=>'/','attribution'=>['utm_source'=>'test']];
$dir = sys_get_temp_dir().'/artbalkon-mail-test-'.bin2hex(random_bytes(8)); mkdir($dir,0700);
$calls = [];
$sender = function($to,$subject,$body,$headers) use (&$calls) { $calls[]=[$to,$subject,base64_decode($body),$headers]; return true; };
try {
    foreach (['callback','contact','quiz','project','gift'] as $index=>$kind) {
        $input = $base; $input['requestId'] = sprintf('12345678-1234-1234-1234-%012d',$index+1);
        $input['form'] = in_array($kind,['project','gift']) ? 'transformation' : $kind;
        if ($input['form'] === 'quiz') $input += ['service'=>'Остекление','object'=>'Балкон','timing'=>'Пока выбираю','gift'=>'Тёплый пол','size'=>'3 метра'];
        if ($input['form'] === 'transformation') $input['project'] = $kind === 'gift' ? 'Тёплый пол' : 'Лоджия с рабочим местом';
        $input['recipient'] = 'attacker@example.org';
        $lead = normalize_mail_lead($input,$options);
        check(deliver_mail_lead($lead,$sender,$dir,'127.0.0.1')['ok'],'Form not accepted');
        check(deliver_mail_lead($lead,$sender,$dir,'127.0.0.1')['ok'],'Duplicate failed');
        check(count($calls) === $index+1,'Duplicate sent twice');
        check($calls[$index][0] === 'balkonart@yandex.ru','Wrong recipient');
        check(str_contains($calls[$index][2],'Телефон: +79991234567'),'Phone missing');
        check(str_contains($calls[$index][2],'utm_source: test'),'Attribution missing');
        if ($kind === 'gift') check(str_contains($calls[$index][2],'Тёплый пол'),'Gift missing');
    }
    foreach (['consent'=>false,'website'=>'bot','phone'=>'0000000000','requestId'=>'bad','name'=>'','form'=>'unknown','attribution'=>'bad'] as $key=>$value) {
        $invalid = $base; $invalid[$key]=$value;
        fails(fn()=>normalize_mail_lead($invalid,$options),InvalidArgumentException::class);
    }
    $quiz = $base; $quiz['form']='quiz';
    fails(fn()=>normalize_mail_lead($quiz,$options),InvalidArgumentException::class);
    $lead = normalize_mail_lead($base,$options);
    fails(fn()=>deliver_mail_lead($lead,fn()=>false,$dir,'127.0.0.2'),RuntimeException::class);
    check(deliver_mail_lead($lead,$sender,$dir,'127.0.0.2')['ok'],'Retry after mail failure failed');
    $lead['name']='Changed';
    fails(fn()=>deliver_mail_lead($lead,$sender,$dir,'127.0.0.2'),InvalidArgumentException::class);
    $journal=file_get_contents($dir.'/journal.json');
    check(!str_contains($journal,'79991234567') && !str_contains($journal,'Тест'),'Personal data retained');
    for ($n=0;$n<10;$n++) {
        $input=$base; $input['requestId']=sprintf('aaaaaaaa-1234-1234-1234-%012d',$n);
        $lead=normalize_mail_lead($input,$options);
        fails(fn()=>deliver_mail_lead($lead,fn()=>false,$dir,'127.0.0.3'),RuntimeException::class);
    }
    $before=count($calls);
    fails(fn()=>deliver_mail_lead($lead,$sender,$dir,'127.0.0.3'),RuntimeException::class);
    check(count($calls)===$before,'Rate limit did not stop mail');
    echo "Mail handler: five form flows, recipient, validation, retry, duplicate and rate limit checks passed.\n";
} finally { foreach(glob($dir.'/*') as $file) unlink($file); rmdir($dir); }
