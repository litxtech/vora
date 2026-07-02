-- user-sounds bucket: 60 sn ses için 10 MB (sıkıştırılmış yükleme)

update storage.buckets
set file_size_limit = 10485760
where id = 'user-sounds';
