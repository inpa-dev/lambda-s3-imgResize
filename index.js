const AWS = require('aws-sdk');
const sharp = require('sharp');

//? 람다에서 돌아가기 때문에, 따로 람다 iam 설정해주지 않는 한 기본으로 CLI 인증없이 바로 돌아감
const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {
   const Bucket = event.Records[0].s3.bucket.name; // 버켓명
   const Key = event.Records[0].s3.object.key; // 업로드된 키명
   const s3obj = { Bucket, Key };

   const filename = Key.split('/')[Key.split('/').length - 1]; // 경로 없애고 뒤의 파일명만
   const ext = Key.split('.')[Key.split('.').length - 1].toLowerCase(); // 파일 확장자만

   const requiredFormat = ext === 'jpg' ? 'jpeg' : ext; // sharp에서는 jpg 대신 jpeg 사용
   console.log('name', filename, 'ext', ext);

   try {
      //* 객체 불러오기
      const s3Object = await s3.getObject(s3obj).promise(); // 버퍼로 가져오기
      console.log('original size', s3Object.Body.length);

      //* 리사이징
      const resizedImage = await sharp(s3Object.Body)
         .resize(400, 400, { fit: 'inside' }) // 400x400 꽉 차게
         .toFormat(requiredFormat)
         .toBuffer();

      //* 객체 넣기
      await s3
         .putObject({
            Bucket,
            Key: `thumb/${filename}`, // 리사이징 된 이미지를 thumb 폴더에 새로저장
            Body: resizedImage,
         })
         .promise();
      console.log('put', resizedImage.length);

      // //* 기존 객체 삭제
      // await s3.deleteObject(s3obj).promise();
      // console.log('del origin img');

      // Lambda 함수 내부에서 모든 작업을 수행한 후에는 그에 대한 결과(또는 오류)와 함께 callback 함수를 호출하고 이를 AWS가 HTTP 요청에 대한 응답으로 처리한다.
      return callback(null, `thumb/${filename}`);
   } catch (error) {
      console.error(error);
      return callback(error);
   }
};
