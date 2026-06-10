\-----

name: affiliate-insert

description: アフィリエイトリンクを映画データに挿入・更新する。「アフィリエイトを追加して」「Amazonリンクを設定して」「VODリンクを更新して」と言われたときに使用。

allowed-tools:

&#x20; - Bash

&#x20; - Read

&#x20; - Write

\---



\# アフィリエイト挿入・管理スキル



\## Amazonアフィリエイトリンク形式

https://www.amazon.co.jp/dp/\[ASIN]?tag=\[あなたのID]-22

必ず rel="nofollow sponsored" をつける。



\## VODアフィリエイト優先順



1位：無料期間のあるVOD（「31日間無料で見る」）

2位：月額最安のVOD

3位：有料レンタル（Amazon等）

4位：Blu-ray・DVD購入

5位：サントラCD



\## 対応VODサービス

\- Amazon Prime Video（月額600円・30日間無料）

\- U-NEXT（月額2189円・31日間無料）

\- Netflix（月額790円〜）

\- Hulu（月額1026円）

\- Disney+（月額990円）



\## アフィリエイトのベストプラクティス



\- VODリンクはファーストビューに配置

\- 「無料で見る」ボタンを最上位に表示

\- Amazon商品は「気に入ったら」の文脈で自然に挿入

\- 価格は「月額990円」と明示（クリック率UP）

\- 全リンクに rel="nofollow sponsored" を付与



\## 映画データへの追加場所

movies/data/\[slug].json の

vod\_services と affiliates に追加する。

