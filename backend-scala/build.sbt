ThisBuild / scalaVersion := "3.3.3"

lazy val root = project
  .in(file("."))
  .settings(
    name := "nova-fashion-api",
    Compile / unmanagedSourceDirectories += baseDirectory.value / "src",
    Compile / run / fork := true,
    libraryDependencies ++= Seq(
      "com.microsoft.sqlserver" % "mssql-jdbc" % "12.8.1.jre11",
      "com.microsoft.sqlserver" % "mssql-jdbc_auth" % "12.8.1.x64",
      "com.lihaoyi" %% "ujson" % "4.1.0",
      "com.github.jwt-scala" %% "jwt-core" % "10.0.1",
      "org.mindrot" % "jbcrypt" % "0.4"
    )
  )
  