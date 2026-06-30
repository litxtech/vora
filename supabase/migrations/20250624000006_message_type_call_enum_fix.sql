-- message_type enum'a 'call' eklendiği kayıtlıydı ama uzak DB'de eksikti;
-- notify_message_recipients tetikleyicisi 'call' ile karşılaştırma yaptığı için
-- tüm mesaj gönderimleri "invalid input value for enum message_type: call" ile düşüyordu.

alter type public.message_type add value if not exists 'call';
