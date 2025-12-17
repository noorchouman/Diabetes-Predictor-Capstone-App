import React from "react";
import { Link } from "react-router-dom";

const Section = ({ title, eyebrow, children }) => (
  <section className="card p-6 md:p-7 space-y-3">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
        <div className="prose prose-sm md:prose-base max-w-none text-gray-700">
          {children}
      </div>
    </div>
  </section>
);

export default function DiabetesInfo() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-5 pt-10 pb-16 space-y-8">
        {/* Hero / intro */}
        <header className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 px-6 py-7 md:px-8 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-semibold tracking-wide uppercase text-emerald-700">
              Type 2 diabetes
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
              Understanding type 2 diabetes
            </h1>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              Type 2 diabetes is a chronic condition affecting millions of people worldwide. 
              It occurs when your body becomes resistant to insulin or doesn't produce enough insulin 
              to maintain normal blood glucose levels. Unlike type 1 diabetes, which typically develops 
              in childhood, type 2 diabetes usually develops in adults and is often linked to lifestyle factors. 
              Early detection and management are crucial for preventing complications and maintaining quality of life.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-emerald-100 px-3 py-1">
                Focus: type 2 diabetes
              </span>
            </div>
          </div>

          {/* Image card using your picture */}
          <div className="shrink-0 w-full md:w-64">
            <div className="rounded-3xl border border-emerald-100 bg-white/80 shadow-sm overflow-hidden">
              <div className="aspect-square w-full overflow-hidden">
              <img
                src="https://images.prismic.io/thriva/2a056a45-daf2-4f31-84b7-217fbd6a94e1_diabetes-blood-test.jpg?auto=compress%2Cformat&fm=webp&w=800&h=800"
                alt="Blood test for diabetes"
                className="h-full w-full object-cover"
              />

              </div>
              <div className="px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-emerald-800">
                  Checking blood sugar
                </p>
                <p className="text-[11px] text-gray-600">
                  Blood tests like HbA1c and fasting glucose are used to screen
                  for type 2 diabetes and prediabetes.
                </p>
                <Link
                  to="/predictor"
                  className="mt-2 inline-flex w-full justify-center btn btn-primary text-xs"
                >
                  Go to risk estimator
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main content sections */}
        <div className="space-y-5 md:space-y-6">
          <Section
            eyebrow="Overview"
            title="What is type 2 diabetes?"
          >
            <p>
              Type 2 diabetes is a long-term condition where the body{" "}
              <strong>does not respond properly to insulin</strong> (insulin
              resistance) and often <strong>does not make enough insulin</strong>
              . Insulin is the hormone that helps glucose move from the blood
              into the body’s cells. When it is not working well, blood glucose
              levels stay higher than they should, especially over many years.
            </p>
            <p>
              Type 2 diabetes usually develops in adults, but it is now seen in
              younger people as well. Many people live with it for years before
              being diagnosed, which is why checking your risk and having
              regular health checks is important.
            </p>
          </Section>

          <Section
            eyebrow="Related condition"
            title="What is prediabetes?"
          >
            <p>
              Prediabetes means blood glucose levels are{" "}
              <strong>higher than normal</strong> but not high enough for a
              diagnosis of diabetes. It is an important warning sign: without
              changes, many people with prediabetes will go on to develop type 2
              diabetes.
            </p>
            <p>
              The positive news is that lifestyle changes – such as healthier
              eating, more physical activity and weight management – can often{" "}
              <strong>delay or prevent progression</strong> to type 2 diabetes
              for many people.
            </p>
          </Section>

          <Section
            eyebrow="Symptoms"
            title="Common signs and symptoms"
          >
            <p>
              Some people have no obvious symptoms for a long time. When
              symptoms do appear, they may include:
            </p>
            <ul>
              <li>Feeling very thirsty and needing to urinate more often</li>
              <li>Unusual tiredness or low energy</li>
              <li>Blurred vision</li>
              <li>Slow-healing cuts or frequent infections</li>
              <li>Unexplained weight loss in some people</li>
            </ul>
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mt-3">
              If you notice these symptoms, especially together, it’s important
              to talk to a healthcare professional and have your blood glucose
              checked.
            </p>
          </Section>

          <Section
            eyebrow="Why it matters"
            title="Why managing blood sugar is important"
          >
            <p>
              Over many years, high blood glucose can damage blood vessels and
              nerves throughout the body. This increases the risk of:
            </p>
            <ul>
              <li>Heart disease and stroke</li>
              <li>Kidney disease</li>
              <li>Eye problems and vision loss</li>
              <li>Nerve damage, especially in the feet</li>
              <li>Foot ulcers and, in severe cases, amputations</li>
            </ul>
            <p>
              The good news is that{" "}
              <strong>early detection and consistent management</strong> can
              greatly reduce the risk of these complications.
            </p>
          </Section>

          <Section
            eyebrow="Risk factors"
            title="Who is at higher risk of type 2 diabetes?"
          >
            <p>
              Type 2 diabetes develops because of a mix of{" "}
              <strong>genetic</strong> and <strong>lifestyle</strong> factors.
              Your risk is higher if:
            </p>
            <ul>
              <li>You have a parent, brother or sister with type 2 diabetes</li>
              <li>
                You are carrying extra weight, especially around your waist or
                abdomen
              </li>
              <li>You are physically inactive most days of the week</li>
              <li>You have high blood pressure or abnormal cholesterol</li>
              <li>
                You had diabetes during pregnancy (gestational diabetes) or gave
                birth to a large baby
              </li>
              <li>
                You are older (risk rises after about age 40–45, but younger
                people can be affected too)
              </li>
              <li>
                Some ethnic backgrounds have higher risk according to large
                population studies
              </li>
            </ul>
          </Section>

          <Section
            eyebrow="Screening"
            title="How type 2 diabetes is diagnosed"
          >
            <p>
              Doctors use blood tests to check for diabetes and for
              “prediabetes”. The most common tests are:
            </p>
            <ul>
              <li>
                <strong>HbA1c</strong> – shows average blood glucose over about
                3 months
              </li>
              <li>
                <strong>Fasting plasma glucose</strong> – blood glucose after an
                overnight fast
              </li>
              <li>
                <strong>Oral glucose tolerance test</strong> – measures how your
                body handles glucose over a few hours
              </li>
            </ul>
            <p>
              A healthcare professional looks at your results together with your
              symptoms and risk factors to decide on a diagnosis and treatment
              plan.
            </p>
          </Section>

          <Section
            eyebrow="Living with type 2"
            title="Living well with type 2 diabetes"
          >
            <p>
              Many people with type 2 diabetes live full, active lives. A care
              plan usually combines:
            </p>
            <ul>
              <li>
                <strong>Healthy eating</strong> – regular meals with vegetables,
                whole grains, healthy fats and protein, while limiting sugary
                drinks and highly processed foods
              </li>
              <li>
                <strong>Physical activity</strong> – even 30 minutes of walking
                on most days can help the body use insulin better
              </li>
              <li>
                <strong>Medication</strong> – tablets or insulin if prescribed
                by your doctor
              </li>
              <li>
                <strong>Regular monitoring</strong> – blood glucose checks and
                routine labs (HbA1c, kidney function, cholesterol)
              </li>
              <li>
                <strong>Check-ups</strong> – eye exams, foot checks and blood
                pressure reviews
              </li>
            </ul>
            <p>
              Emotional wellbeing also matters. Diabetes can feel overwhelming
              at times, and support from family, peers and professionals can
              make a big difference.
            </p>
          </Section>

          <Section
            eyebrow="Prevention"
            title="Can type 2 diabetes be prevented or delayed?"
          >
            <p>
              Large studies show that people at high risk can often{" "}
              <strong>delay or prevent</strong> type 2 diabetes by changing
              everyday habits. Helpful steps include:
            </p>
            <ul>
              <li>
                Aiming for a healthy weight – even 5–7% weight loss can make a
                difference for many people
              </li>
              <li>Being active on most days of the week</li>
              <li>
                Choosing mainly whole, minimally processed foods and cutting
                down on sugary drinks
              </li>
              <li>Not smoking (or getting support to quit)</li>
              <li>
                Having regular check-ups if you already have risk factors or
                prediabetes
              </li>
            </ul>
          </Section>

          <Section
            eyebrow="Support in Lebanon"
            title="Getting help and supporting others"
          >
            <p>
              If you are in Lebanon and concerned about your risk, it can help
              to <strong>talk with a healthcare professional</strong> who
              understands diabetes care in your community.
            </p>

            <div className="mt-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 space-y-2">
                <h3 className="text-sm font-semibold">Support diabetes care</h3>
                <p className="text-sm text-gray-700">
                  If you would like to support people living with diabetes in Lebanon, you can donate through{" "}
                  <span className="font-medium">DiaLeb</span>, the National Diabetes Organization.
                </p>
                <a
                  href="https://www.dialeb.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary text-sm"
                >
                  Donate to DiaLeb
                </a>
              </div>
            </div>
          </Section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-4">
          <Link to="/predictor" className="btn text-sm">
            Back to Risk Estimator
          </Link>
        </div>
      </div>
    </div>
  );
}
