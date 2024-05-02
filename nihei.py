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

rd=[]
for year in range(2012,2013):
   for month in range(1,2):
      rd.append(get_race_dates(year,month))

race_dates=[]
for i in rd:
   for j in i:
      race_dates.append(j)
      
print(race_dates)



