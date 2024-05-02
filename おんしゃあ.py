import numpy as np
import pandas as pd
import lightgbm as lgb
import matplotlib.pyplot as plt
import seaborn as sns

#データの読み込み
df = pd.read_csv('ボストン住宅価格データ.csv',encoding='shift-jis')

#予測ターゲットの格納（住宅価格：A列）
target_df = df[["住宅価格"]]
#特徴量の格納（説明変数：B列以降）
train_df = df.iloc[:,1:14]



#XGBoostで学習するためのデータ形式に変換
dtrain = lgb.Dataset(train_df)
dvalid = lgb.Dataset(target_df)
print(dtrain)
