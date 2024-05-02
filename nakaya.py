import requests
from bs4 import BeautifulSoup
import re
import pandas as pd
from time import sleep
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service 
from webdriver_manager.chrome import ChromeDriverManager

def get_race_dates(year,month):
    print("year =",year,"month=",month)

    url="https://race.netkeiba.com/top/calendar.html?year="+str(year)+"&month="+str(month)
    res=requests.get(url)
    soup=BeautifulSoup(res.text,"html.parser")

    table=soup.table
    a_list=table.find_all("a")
  
    url_list=[]
    race_dates=[]

    for i in a_list:
      url_list.append(i.attrs["href"])

    for i in url_list:
      race_dates.append(i.split("=")[1])

    #print(race_dates)
    sleep(1) 
    return race_dates

    #df_title_url=pd.DataFrame({"date":date_list})
    #print(df_title_url)

######################################################################################################

#race_dateが並んだリスト作成
damena_race_dates=[]
for year in range(2012,2013):
   for month in range(1,2):
      damena_race_dates.append(get_race_dates(year,month))

race_dates=[]
for i in damena_race_dates:
   for j in i:
      race_dates.append(j)
      
print(race_dates)

#########################################################

def get_race_ids(race_date):
    option=Options()
    option.add_experimental_option('excludeSwitches',['enable-logging']) 
    driver=webdriver.Chrome(options=option)

    url='https://race.netkeiba.com/top/race_list.html?kaisai_date='+str(race_date)
    driver.get(url)

    sleep(1)

    karenda=driver.find_element(By.XPATH,'//*[@id="RaceTopRace"]')

    a_list=karenda.find_elements(By.TAG_NAME,'a')

    url_list=[]
    for a in a_list:
        url=a.get_attribute("href")
        if "https://race.netkeiba.com/top/payback_list.html?kaisai_id" not in url:
            if "movie" not in url:
                url_list.append(url)

    race_ids=[]
    for i in url_list:
        race_ids.append(i.split("=")[1].split("&")[0])

    #for i in race_ids:
        #print(i)

    #df_race_id=pd.DataFrame({"raceid":race_ids})
    #print(df_race_id)

    driver.close()
    return race_ids

#####################################################################################

#race_idsのとき
damena_race_ids=[]
for race_date in race_dates:
    damena_race_ids.append(get_race_ids(race_date))

#一重のリストにする
race_ids=[]
for i in damena_race_ids:
    for j in i:
        race_ids.append(j)

print(race_ids)

##############################################################################################

def get_race_result_html(race_id):
    url="https://db.netkeiba.com/race/"+str(race_id)
    html=requests.get(url)#,encoding="UTF-8")
    return(html)

#################################################################################################

def get_race_cond(html,race_id):
    soup=BeautifulSoup(html.content,"html.parser")
    soup2=BeautifulSoup(html.text,"html.parser")
    #日本語はごみデータ。.textだとunicode文字列で文字化けの可能性。contentはbytes文字列。

    #レース名はrace_name
    race_name=soup.select("#main > div > div > div > diary_snap > div > div > dl > dd > h1")
    race_name=race_name[0].contents[0]
    #print(race_name)

    #レースはrace_No
    race_No=soup.select("#main > div > div > div > diary_snap > div > div > dl > dt")
    race_No=race_No[0].contents[0]
    race_No=race_No.replace("\n","")
    race_No=race_No.replace("R","")
    #print(race_No)


    race_cond=soup.select("#main > div > div > div > diary_snap > div > div > dl > dd > p > diary_snap_cut > span")
    race_cond=race_cond[0].contents[0]
    race_cond=str(race_cond)
    race_cond=race_cond.replace(" ","")
    race_cond=race_cond.replace("\xa0","")
    race_cond=race_cond.split("/")
    #print(race_cond)

    date_place_class=soup.select("#main > div > div > div > diary_snap > div > div > p")
    date_place_class=date_place_class[0].contents[0]
    date_place_class=str(date_place_class)
    date_place_class=date_place_class.split(" ")
    #print(date_place_class)


    #placeは競技場
    place=date_place_class[1]
    place=place.replace("回","")
    place=place.replace("日目","")
    place=re.sub("[0-9]+","",place)
    #print(place)

    #class1はclass1
    class1=date_place_class[2]
    class1=class1.split("\xa0")[0]
    #print(class1)

    #class1aはclass1a
    class1a=class1
    class1a=class1a.replace("500万下","1勝クラス")
    class1a=class1a.replace("1000万下","2勝クラス")
    class1a=class1a.replace("1600万下","3勝クラス")

    #class2はclass2
    class2=date_place_class[2]
    class2=class2.split("\xa0")[2]
    #print(class2)

    #distanceは距離
    distance=race_cond[0]
    distance=re.sub(r"\D","",distance)
    distance=int(distance)
    #print(distance)

    #turfは左右
    turf=race_cond[0]
    turf=re.sub("[0-9]+","",turf)
    turf=re.sub("m","",turf)
    #print(turf)

    return race_id,date_place_class[1],date_place_class[0],place,race_No,race_name,date_place_class[2],class1,class1a,class2,race_cond[2].split(":")[0],distance,turf,race_cond[1].split(":")[1],race_cond[2].split(":")[1]

#####################################################################################################################################################
#以下でdataframe作成

#race_ids=[201210010107,201210010108,201210010109,201210010110,201210010111,201210010112,201206010501,201206010502,201206010503,201206010504,201206010505,201206010506,201206010507,201206010508,201206010509,201206010510,201206010511,201206010512,201208010501,201208010502,201208010503,201208010504,201208010505,201208010506,201208010507, 201208010508, 201208010509, 201208010510]

a_list=[]
b_list=[]
c_list=[]
d_list=[]
e_list=[]
f_list=[]
g_list=[]
h_list=[]
i_list=[]
j_list=[]
k_list=[]
l_list=[]
m_list=[]
n_list=[]
o_list=[]

for race_id in race_ids:
    a,b,c,d,e,f,g,h,i,j,k,l,m,n,o=get_race_cond(get_race_result_html(race_id),race_id)
    a_list.append(a)
    b_list.append(b)
    c_list.append(c)
    d_list.append(d)
    e_list.append(e)
    f_list.append(f)
    g_list.append(g)
    h_list.append(h)
    i_list.append(i)
    j_list.append(j)
    k_list.append(k)
    l_list.append(l)
    m_list.append(m)
    n_list.append(n)
    o_list.append(o)


cond_df=pd.DataFrame({"race_id":a_list,"開催":b_list,"日付":c_list,"競技場":d_list,"レースNo":e_list,"レース名":f_list,"クラス":g_list,"class1":h_list,"class1a":i_list,"class2":j_list,"馬場":k_list,"距離":l_list,"左右":m_list,"天候":n_list,"馬場状態":o_list})
print(cond_df)

############################################################################################