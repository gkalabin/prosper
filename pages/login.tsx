import { TextInput } from "components/forms/Input";
import Layout from "components/Layout";
import { Form, Formik, FormikHelpers } from "formik";
import useUser from "lib/useUser";
import Router from "next/router";
import { useState } from "react";

interface LoginFormValues {
  login: string;
  password: string;
}

const defaultPage = "/overview";

export default function Login() {
  const {
    user,
    mutateUser,
    isLoading: isUserLoading,
  } = useUser({
    redirectTo: defaultPage,
    redirectIfFound: true,
  });
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(
    values: LoginFormValues,
    { setSubmitting }: FormikHelpers<LoginFormValues>
  ) {
    setErrorMsg("");
    try {
      // TODO: don't send password plain text
      const body = JSON.stringify(values);
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });
      if (response.ok) {
        mutateUser(await response.json());
      } else {
        setSubmitting(false);
        setErrorMsg(`Login failed: ${await response.text()}`);
      }
    } catch (error) {
      setSubmitting(false);
      console.log(error);
      setErrorMsg(`Login failed: ${error}`);
    }
  }

  if (user?.isLoggedIn) {
    Router.push(defaultPage);
    return (
      <Layout>
        <div className="md:w-2/3">
          <div className="mt-20 flex justify-center">
          <span>Loading <code>{defaultPage}</code> page…</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (isUserLoading) {
    return (
      <Layout>
        <div className="mt-20 flex justify-center">
          <div className="md:w-2/3">
            <span>Loading login data…</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mt-20 flex justify-center">
        <div className="md:w-96">
          <Formik
            initialValues={{
              login: "",
              password: "",
            }}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form>
                <div className="mb-4 overflow-hidden shadow sm:rounded-md">
                  <div className="bg-white px-2 py-5 sm:p-6">
                    <div className="grid grid-cols-6 gap-6">
                      {/* Inputs */}
                      <div className="col-span-6">
                        <TextInput name="login" label="Login" />
                        <TextInput
                          name="password"
                          type="password"
                          label="Password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="align-right flex bg-gray-50 px-4 py-3 sm:px-6">
                    {errorMsg && (
                      <div className="grow text-left text-red-700">
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {isSubmitting ? "Logging in…" : "Login"}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}
