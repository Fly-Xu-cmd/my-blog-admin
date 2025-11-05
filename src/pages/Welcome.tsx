import { getDynamics, getPosts } from "@/services/nextjs";
import { Line, Pie } from "@ant-design/plots";
import { PageContainer } from "@ant-design/pro-components";
import { Card, Space } from "antd";
import React, { useEffect, useState } from "react";
import { useModel } from "umi";

const Welcome: React.FC = () => {
  const [postData, setPostData] = useState<any[]>([]);
  const [dynamicData, setDynamicData] = useState<any[]>([]);
  const { initialState, loading } = useModel("@@initialState");

  console.log('initialState', initialState);
  useEffect(() => {
    getPosts().then((res: any) => {
      setPostData(res.data);
    });

    getDynamics().then((res: any) => {
      setDynamicData(res.data);
    });
  }, []);

  const lineData: { year: string; value: number; category?: string }[] = [];
  const pieData: { type: string; value: number; category?: string }[] = [];
  const postYears: any = {};
  const categories: any = {};
  const dynamicYears: any = {};

  postData.forEach((item: any) => {
    const year = item.createdAt.split("T")[0];
    const category = item.category?.name || "其他";
    if (!postYears[year]) {
      postYears[year] = 0;
    }
    postYears[year]++;
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category]++;
  });
  Object.keys(postYears).forEach((key) => {
    lineData.unshift({ year: key, value: postYears[key], category: "博客" });
  });
  Object.keys(categories).forEach((key) => {
    pieData.push({ type: key, value: categories[key], category: "博客" });
  });
  dynamicData.forEach((item: any) => {
    const year = item.createdAt.split("T")[0];
    if (!dynamicYears[year]) {
      dynamicYears[year] = 0;
    }
    dynamicYears[year]++;
  });
  Object.keys(dynamicYears).forEach((key) => {
    lineData.unshift({
      year: key,
      value: dynamicYears[key],
      category: "动态",
    });
  });
  console.log("lineData", lineData);
  lineData.sort((a, b) => {
    return Date.parse(a.year) - Date.parse(b.year);
  });
  const lineConfig = {
    data: lineData,
    title: "博客和动态数量趋势",
    xField: "year",
    yField: "value",
    point: {
      shapeField: "square",
      sizeField: 4,
    },
    interaction: {
      tooltip: {
        marker: false,
      },
    },
    style: {
      lineWidth: 2,
    },
    colorField: "category",
  };
  const pieConfig = {
    title: "博客文章分类分布",
    data: pieData,
    angleField: "value",
    colorField: "type",
    label: {
      text: "value",
      style: {
        fontWeight: "bold",
      },
    },
    legend: {
      color: {
        title: false,
        position: "right",
        rowPadding: 5,
      },
    },
  };

  return (
    <PageContainer title="欢迎来到我的博客管理系统">
      <Space align="baseline" size={24}>
        <Card>
          <Line {...lineConfig}></Line>
        </Card>
        <Card>
          <Pie {...pieConfig}></Pie>
        </Card>
      </Space>
    </PageContainer>
  );
};

export default Welcome;
