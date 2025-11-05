import { login } from "@/services/nextjs/login";
import type { FormProps } from "antd";
import { Button, Checkbox, Form, Input, message } from "antd";
import { useModel, useNavigate } from "umi";
import "./style.less";

type FieldType = {
  username?: string;
  password?: string;
  remember?: string;
};

export default function LoginForm() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { initialState, loading, setInitialState } = useModel("@@initialState");

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    console.log("Success:", values);
    if (!values.username || !values.password) {
      messageApi.error("用户名或密码不能为空");
      return;
    }
    login({
      username: values.username,
      password: values.password,
      remember: values.remember,
    }).then((res) => {
      if (res.ok) {
        messageApi.success("登录成功");
        localStorage.setItem("accessToken", res.data?.token || "");
        setInitialState({
          ...initialState,
          currentUser: {
            access: "admin",
            name: "若木",
          },
        });
        if (!loading) {
          navigate("/");
        }
      } else {
        messageApi.error(res.error || "登录失败");
      }
    });
  };

  const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (
    errorInfo
  ) => {
    console.log("Failed:", errorInfo);
  };
  return (
    <>
      {contextHolder}
      <div className="login-box">
        <div className="bg-mask">
          <div className="login-form">
            <div className="login-form-title">后台管理</div>
            <Form
              name="basic"
              title="用户登录"
              layout="vertical"
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
            >
              <Form.Item<FieldType>
                label="用户名"
                name="username"
                rules={[{ required: true, message: "请输入用户名" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item<FieldType>
                label="密码"
                name="password"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item<FieldType>
                name="remember"
                valuePropName="checked"
                label={null}
              >
                <Checkbox>记住密码</Checkbox>
              </Form.Item>

              <Form.Item label={null}>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{ width: "100%" }}
                >
                  登入
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
